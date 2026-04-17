import { and, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { fileTypeFromBuffer } from 'file-type';
import { nanoid } from 'nanoid';
import type { MultipartFile } from '@fastify/multipart';

import type {
  ClientProfile,
  ClientProfileImportResponse,
  ClientProfileReassign,
  ClientProfileReassignResponse,
  ListClientProfilesQuery,
  ListClientProfilesResponse,
} from '@a1prime/schemas';
import { BusinessRuleError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { db, type DbTransaction, withDbTransaction } from '@/db/client';
import { agentProfiles, clientProfiles, systemAuditLogs, userAccounts } from '@/schema';
import type { AuthTokenPayload } from '@/shared/lib/auth';
import { emailQueueService } from '@/services/email-queue.service';
import { r2Service } from '@/lib/r2';
import { decryptEmail } from '@/shared/lib/encryption';

type ClientProfileRow = {
  id: string;
  assignedAgentId: string | null;
  firstName: string;
  lastName: string;
  policyNumber: string;
  modalPremium: string;
  api: string;
  sumAssured: string;
  commissionAmount: string;
  caseStatus: ClientProfile['caseStatus'];
  policyStatus: ClientProfile['policyStatus'];
  createdAtUtc: Date;
  updatedAtUtc: Date;
};

type AgentLookupRow = {
  id: string;
  displayName: string;
  email: string;
};

const MAX_IMPORT_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const IMPORT_URL_EXPIRY_SECONDS = 15 * 60;
const ALLOWED_IMPORT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
type AllowedImportMimeType = (typeof ALLOWED_IMPORT_MIME_TYPES)[number];

/**
 * Provides scoped client profile list operations for COSAF endpoints.
 */
export class ClientProfilesService {
  /**
   * Lists paginated client profiles for the authenticated actor.
   *
   * Development EXPLAIN ANALYZE reference:
   * Index Scan using idx_clientprofiles_agent_status on "ClientProfiles"
   *   Index Cond: (("AssignedAgentId" = $1) AND ("PolicyStatus" = $2))
   *   Filter: ("DeletedAtUtc" IS NULL)
   *
   * @param query Validated query string filters and pagination settings.
   * @param actorUser Authenticated JWT payload.
   * @returns ListClientProfilesResponse
   * @throws {ForbiddenError} if an Agent token is missing its agent scope.
   */
  async listClientProfiles(
    query: ListClientProfilesQuery,
    actorUser: AuthTokenPayload,
  ): Promise<ListClientProfilesResponse> {
    const page = query.page;
    const pageSize = query.pageSize;
    const offset = (page - 1) * pageSize;

    const conditions = [isNull(clientProfiles.deletedAtUtc)];

    if (actorUser.role === 'Agent') {
      if (!actorUser.agentId) {
        throw new ForbiddenError('Agents must be linked to an agent profile.');
      }

      conditions.push(eq(clientProfiles.assignedAgentId, actorUser.agentId));
    } else if (query.agentId) {
      conditions.push(eq(clientProfiles.assignedAgentId, query.agentId));
    }

    if (query.status) {
      conditions.push(eq(clientProfiles.caseStatus, query.status));
    }

    if (query.search) {
      const searchTerm = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(clientProfiles.firstName, searchTerm),
          ilike(clientProfiles.lastName, searchTerm),
          ilike(clientProfiles.policyNumber, searchTerm),
        )!,
      );
    }

    const whereClause = and(...conditions);

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: clientProfiles.id,
          assignedAgentId: clientProfiles.assignedAgentId,
          firstName: clientProfiles.firstName,
          lastName: clientProfiles.lastName,
          policyNumber: clientProfiles.policyNumber,
          modalPremium: clientProfiles.modalPremium,
          api: clientProfiles.api,
          sumAssured: clientProfiles.sumAssured,
          commissionAmount: clientProfiles.commissionAmount,
          caseStatus: clientProfiles.caseStatus,
          policyStatus: clientProfiles.policyStatus,
          createdAtUtc: clientProfiles.createdAt,
          updatedAtUtc: clientProfiles.updatedAt,
        })
        .from(clientProfiles)
        .where(whereClause)
        .orderBy(desc(clientProfiles.updatedAt), desc(clientProfiles.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({
          total: sql<number>`count(*)::int`,
        })
        .from(clientProfiles)
        .where(whereClause),
    ]);

    const total = totalRows[0]?.total ?? 0;

    return {
      data: rows.map((row) => this.mapClientProfile(row)),
      meta: {
        total,
        page,
        pageSize,
        hasNextPage: offset + rows.length < total,
      },
    };
  }

  /**
   * Uploads a validated client profile import file to private Cloudflare R2 storage.
   *
   * @param file Multipart upload file from Fastify.
   * @returns Import metadata plus a signed URL valid for 15 minutes.
   * @throws {BusinessRuleError} If the file exceeds 20MB or is not a supported MIME type.
   * @throws {Error} If R2 upload or signed URL generation fails.
   */
  async importClientProfile(file: MultipartFile): Promise<ClientProfileImportResponse> {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    for await (const chunk of file.file) {
      totalBytes += chunk.length;

      if (totalBytes > MAX_IMPORT_FILE_SIZE_BYTES) {
        throw new BusinessRuleError('Client profile import files must not exceed 20MB.');
      }

      chunks.push(Buffer.from(chunk));
    }

    const fileBuffer = Buffer.concat(chunks);
    const detectedFileType = await fileTypeFromBuffer(fileBuffer);

    if (
      !detectedFileType ||
      !ALLOWED_IMPORT_MIME_TYPES.includes(detectedFileType.mime as AllowedImportMimeType)
    ) {
      throw new BusinessRuleError('Client profile import files must be a PDF, JPEG, or PNG.');
    }

    const mimeType = detectedFileType.mime as AllowedImportMimeType;

    const objectKey = `client-profiles/imports/${nanoid()}.${detectedFileType.ext}`;
    await r2Service.uploadPrivateObject({
      key: objectKey,
      body: fileBuffer,
      contentType: mimeType,
    });

    const signedUrl = await r2Service.getSignedObjectUrl(objectKey, IMPORT_URL_EXPIRY_SECONDS);
    const expiresAt = new Date(Date.now() + IMPORT_URL_EXPIRY_SECONDS * 1000);

    return {
      objectKey,
      fileName: file.filename,
      mimeType,
      sizeBytes: totalBytes,
      signedUrl,
      expiresAtUtc: expiresAt.toISOString(),
    };
  }

  /**
   * Reassigns a batch of client profiles from one agent to another inside a single transaction.
   *
   * @param input Validated reassignment payload.
   * @param actorUser Authenticated JWT payload.
   * @returns The total number of successfully reassigned client profiles.
   * @throws {NotFoundError} If the source or destination agent does not exist.
   * @throws {BusinessRuleError} If any client profile is missing or not assigned to the source agent.
   * @throws {Error} Rethrows transaction failures so the full batch rolls back.
   */
  async reassignClientProfiles(
    input: ClientProfileReassign,
    actorUser: AuthTokenPayload,
  ): Promise<ClientProfileReassignResponse> {
    return withDbTransaction('cosaf.reassign-profiles', async (tx) => {
      const [sourceAgent, destinationAgent] = await Promise.all([
        this.findActiveAgent(tx, input.sourceAgentId),
        input.destinationAgentId ? this.findActiveAgent(tx, input.destinationAgentId) : null,
      ]);

      if (!sourceAgent) {
        throw new NotFoundError('Source agent was not found.');
      }

      if (input.destinationAgentId && !destinationAgent) {
        throw new NotFoundError('Destination agent was not found.');
      }

      const rows = await tx
        .select({
          id: clientProfiles.id,
          assignedAgentId: clientProfiles.assignedAgentId,
        })
        .from(clientProfiles)
        .where(
          and(
            inArray(clientProfiles.id, input.clientProfileIds),
            eq(clientProfiles.assignedAgentId, input.sourceAgentId),
            isNull(clientProfiles.deletedAtUtc),
          ),
        );

      if (rows.length !== input.clientProfileIds.length) {
        throw new BusinessRuleError(
          'All client profiles must exist and be assigned to the source agent.',
        );
      }

      const updatedAt = new Date();

      await tx
        .update(clientProfiles)
        .set({
          assignedAgentId: input.destinationAgentId,
          caseStatus: input.destinationAgentId ? 'For Approval' : 'Orphan',
          updatedAt,
        })
        .where(inArray(clientProfiles.id, input.clientProfileIds));

      await tx.insert(systemAuditLogs).values(
        rows.map((row) => ({
          actorUserId: actorUser.sub,
          action: 'client-profile.reassigned',
          entityName: 'ClientProfile',
          entityId: row.id,
          oldValue: {
            assignedAgentId: row.assignedAgentId,
          },
          newValue: {
            assignedAgentId: input.destinationAgentId,
            caseStatus: input.destinationAgentId ? 'For Approval' : 'Orphan',
          },
        })),
      );

      if (destinationAgent) {
        await emailQueueService.enqueueEmail({
          to: destinationAgent.email,
          subject: 'New client reassignment batch',
          text: `${rows.length} client profile(s) were reassigned to ${destinationAgent.displayName}.`,
        });
      }

      return {
        reassignedCount: rows.length,
      };
    });
  }

  private mapClientProfile(row: ClientProfileRow): ClientProfile {
    return {
      id: row.id,
      assignedAgentId: row.assignedAgentId,
      firstName: row.firstName,
      lastName: row.lastName,
      policyNumber: row.policyNumber,
      modalPremium: String(row.modalPremium),
      api: String(row.api),
      sumAssured: String(row.sumAssured),
      commissionAmount: String(row.commissionAmount),
      caseStatus: row.caseStatus,
      policyStatus: row.policyStatus,
      createdAtUtc: row.createdAtUtc.toISOString(),
      updatedAtUtc: row.updatedAtUtc.toISOString(),
    };
  }

  private async findActiveAgent(
    tx: DbTransaction,
    agentId: string,
  ): Promise<AgentLookupRow | null> {
    const [agent] = await tx
      .select({
        id: agentProfiles.id,
        displayName: agentProfiles.displayName,
        encryptedEmail: userAccounts.encryptedEmail,
      })
      .from(agentProfiles)
      .innerJoin(userAccounts, eq(userAccounts.id, agentProfiles.userId))
      .where(
        and(
          eq(agentProfiles.id, agentId),
          isNull(agentProfiles.deletedAtUtc),
          isNull(userAccounts.deletedAtUtc),
        ),
      )
      .limit(1);

    return agent
      ? {
          id: agent.id,
          displayName: agent.displayName,
          email: decryptEmail(agent.encryptedEmail),
        }
      : null;
  }
}

export const clientProfilesService = new ClientProfilesService();
