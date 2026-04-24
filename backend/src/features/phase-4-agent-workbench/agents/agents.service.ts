import { and, asc, eq, ilike, isNull, or } from 'drizzle-orm';
import { fileTypeFromBuffer } from 'file-type';
import type { MultipartFile } from '@fastify/multipart';

import type {
  AgentStatus,
  AgentLookupResponse,
  AgentProfile,
  DelistAgentResponse,
  ListAgentsQuery,
  UpdateAgentProfile,
} from '@a1prime/schemas';
import { db, withDbTransaction } from '@/db/client';
import { BusinessRuleError, ForbiddenError, NotFoundError } from '@/lib/errors';
import {
  agentProfiles,
  ape,
  clientAssignmentHistory,
  clientProfiles,
  nap,
  systemAuditLogs,
  userAccounts,
} from '@/schema';
import type { AuthTokenPayload } from '@/shared/lib/auth';
import { logSystemAudit } from '@/shared/lib/audit';
import { decryptEmail, encryptEmail, hashEmail, normalizeEmail } from '@/shared/lib/encryption';
import { r2Service } from '@/lib/r2';

const ORPHAN_POOL_AGENT_CODE = 'ORPHAN_POOL';
const PROFILE_PHOTO_URL_EXPIRY_SECONDS = 15 * 60;
const ALLOWED_PROFILE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type AgentProfileRow = {
  id: string;
  userId: string;
  encryptedEmail: string;
  firstName: string;
  lastName: string;
  displayName: string;
  agentCode: string;
  branchCode: string;
  profileImageKey: string | null;
  status: AgentStatus;
  role: AgentProfile['role'];
  createdAtUtc: Date;
  updatedAtUtc: Date;
};

async function resolveProfileImageUrl(profileImageKey: string | null): Promise<string | null> {
  if (!profileImageKey) {
    return null;
  }

  try {
    return await r2Service.getSignedObjectUrl(profileImageKey, PROFILE_PHOTO_URL_EXPIRY_SECONDS);
  } catch {
    return null;
  }
}

async function mapAgentProfile(
  row: AgentProfileRow,
  auditTrail: AgentProfile['auditTrail'],
): Promise<AgentProfile> {
  return {
    id: row.id,
    userId: row.userId,
    email: decryptEmail(row.encryptedEmail),
    firstName: row.firstName,
    lastName: row.lastName,
    displayName: row.displayName,
    agentCode: row.agentCode,
    branchCode: row.branchCode,
    profileImageUrl: await resolveProfileImageUrl(row.profileImageKey),
    status: row.status,
    role: row.role,
    createdAtUtc: row.createdAtUtc.toISOString(),
    updatedAtUtc: row.updatedAtUtc.toISOString(),
    auditTrail,
  };
}

export class AgentsService {
  private assertAgentSelfAccess(targetAgentId: string, actorUser: AuthTokenPayload) {
    if (actorUser.role === 'Agent' && actorUser.agentId !== targetAgentId) {
      throw new ForbiddenError('Agents can only access their own profile.');
    }
  }

  private async getAgentProfileRecord(agentId: string): Promise<AgentProfileRow | null> {
    const [record] = await db
      .select({
        id: agentProfiles.id,
        userId: userAccounts.id,
        encryptedEmail: userAccounts.encryptedEmail,
        firstName: userAccounts.firstName,
        lastName: userAccounts.lastName,
        displayName: agentProfiles.displayName,
        agentCode: agentProfiles.agentCode,
        branchCode: agentProfiles.branchCode,
        profileImageKey: agentProfiles.profileImageKey,
        status: agentProfiles.status,
        role: userAccounts.role,
        createdAtUtc: agentProfiles.createdAt,
        updatedAtUtc: agentProfiles.updatedAt,
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

    return record ?? null;
  }

  async getAgentProfile(agentId: string, actorUser: AuthTokenPayload): Promise<AgentProfile> {
    this.assertAgentSelfAccess(agentId, actorUser);

    const record = await this.getAgentProfileRecord(agentId);

    if (!record) {
      throw new NotFoundError('Agent profile was not found.');
    }

    const auditRows = await db
      .select({
        id: systemAuditLogs.id,
        action: systemAuditLogs.action,
        createdAtUtc: systemAuditLogs.createdAt,
      })
      .from(systemAuditLogs)
      .where(
        and(eq(systemAuditLogs.entityName, 'AgentProfile'), eq(systemAuditLogs.entityId, agentId)),
      )
      .orderBy(asc(systemAuditLogs.createdAt));

    return mapAgentProfile(
      record,
      auditRows.map((row) => ({
        id: row.id,
        action: row.action,
        actorName: 'System',
        timestampUtc: row.createdAtUtc.toISOString(),
        summary: row.action.replace(/\./g, ' '),
      })),
    );
  }

  async listAgents(query: ListAgentsQuery): Promise<AgentLookupResponse> {
    const conditions = [isNull(agentProfiles.deletedAtUtc), isNull(userAccounts.deletedAtUtc)];

    if (query.search) {
      const searchTerm = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(agentProfiles.displayName, searchTerm),
          ilike(agentProfiles.agentCode, searchTerm),
          ilike(agentProfiles.branchCode, searchTerm),
          ilike(userAccounts.firstName, searchTerm),
          ilike(userAccounts.lastName, searchTerm),
        )!,
      );
    }

    const rows = await db
      .select({
        id: agentProfiles.id,
        displayName: agentProfiles.displayName,
        agentCode: agentProfiles.agentCode,
        status: agentProfiles.status,
        encryptedEmail: userAccounts.encryptedEmail,
      })
      .from(agentProfiles)
      .innerJoin(userAccounts, eq(userAccounts.id, agentProfiles.userId))
      .where(and(eq(agentProfiles.status, 'Active'), ...conditions))
      .orderBy(asc(agentProfiles.displayName))
      .limit(query.limit);

    return {
      data: rows.map((row) => ({
        id: row.id,
        displayName: row.displayName,
        agentCode: row.agentCode,
        email: decryptEmail(row.encryptedEmail),
        status: row.status,
      })),
    };
  }

  async updateAgentProfile(
    agentId: string,
    input: UpdateAgentProfile,
    actorUser: AuthTokenPayload,
    actorUserId: string,
  ): Promise<AgentProfile> {
    this.assertAgentSelfAccess(agentId, actorUser);

    return withDbTransaction('agents.update-profile', async (tx) => {
      const [existing] = await tx
        .select({
          agentId: agentProfiles.id,
          userId: userAccounts.id,
          encryptedEmail: userAccounts.encryptedEmail,
          firstName: userAccounts.firstName,
          lastName: userAccounts.lastName,
          displayName: agentProfiles.displayName,
          agentCode: agentProfiles.agentCode,
          branchCode: agentProfiles.branchCode,
          profileImageKey: agentProfiles.profileImageKey,
          status: agentProfiles.status,
          role: userAccounts.role,
          createdAtUtc: agentProfiles.createdAt,
          updatedAtUtc: agentProfiles.updatedAt,
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

      if (!existing) {
        throw new NotFoundError('Agent profile was not found.');
      }

      const normalizedEmail = normalizeEmail(input.email);
      const updatedAt = new Date();

      await tx
        .update(userAccounts)
        .set({
          encryptedEmail: encryptEmail(normalizedEmail),
          emailHash: hashEmail(normalizedEmail),
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          updatedAt,
        })
        .where(eq(userAccounts.id, existing.userId));

      await tx
        .update(agentProfiles)
        .set({
          branchCode: input.branchCode?.trim() || existing.branchCode,
          displayName: input.displayName.trim(),
          updatedAt,
        })
        .where(eq(agentProfiles.id, existing.agentId));

      await logSystemAudit(
        {
          action: 'agent-profile.updated',
          userId: actorUserId,
          entityName: 'AgentProfile',
          resourceId: agentId,
          oldValue: {
            email: decryptEmail(existing.encryptedEmail),
            firstName: existing.firstName,
            lastName: existing.lastName,
            displayName: existing.displayName,
            branchCode: existing.branchCode,
          },
          newValue: {
            email: normalizedEmail,
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            displayName: input.displayName.trim(),
            branchCode: input.branchCode?.trim() || existing.branchCode,
          },
        },
        tx,
      );

      return this.getAgentProfile(agentId, actorUser);
    });
  }

  async uploadProfilePhoto(
    agentId: string,
    upload: MultipartFile,
    actorUser: AuthTokenPayload,
    actorUserId: string,
  ) {
    this.assertAgentSelfAccess(agentId, actorUser);

    const existing = await this.getAgentProfileRecord(agentId);

    if (!existing) {
      throw new NotFoundError('Agent profile was not found.');
    }

    const buffer = await upload.toBuffer();
    const detectedType = await fileTypeFromBuffer(buffer);
    const mimeType = detectedType?.mime ?? upload.mimetype;

    if (!ALLOWED_PROFILE_MIME_TYPES.has(mimeType)) {
      throw new BusinessRuleError('Profile photo must be a JPG, PNG, or WEBP image.');
    }

    const extension = detectedType?.ext ?? 'bin';
    const key = `agents/profile-photos/${existing.agentCode}.${extension}`;

    await r2Service.uploadPrivateObject({
      key,
      body: buffer,
      contentType: mimeType,
    });

    await db
      .update(agentProfiles)
      .set({
        profileImageKey: key,
        updatedAt: new Date(),
      })
      .where(eq(agentProfiles.id, agentId));

    await logSystemAudit({
      action: 'agent-profile.photo-updated',
      userId: actorUserId,
      entityName: 'AgentProfile',
      resourceId: agentId,
      newValue: {
        profileImageKey: key,
      },
    });

    return this.getAgentProfile(agentId, actorUser);
  }

  async delistAgent(targetAgentCode: string, actorUserId: string): Promise<DelistAgentResponse> {
    const normalizedAgentCode = targetAgentCode.trim();

    if (!normalizedAgentCode) {
      throw new BusinessRuleError('Target agent code is required.');
    }

    if (normalizedAgentCode === ORPHAN_POOL_AGENT_CODE) {
      throw new BusinessRuleError('The orphan pool cannot be delisted.');
    }

    return withDbTransaction('agents.delist-agent', async (tx) => {
      const [existingAgent] = await tx
        .select({
          id: agentProfiles.id,
          userId: agentProfiles.userId,
          agentCode: agentProfiles.agentCode,
          branchCode: agentProfiles.branchCode,
          status: agentProfiles.status,
        })
        .from(agentProfiles)
        .where(
          and(
            eq(agentProfiles.agentCode, normalizedAgentCode),
            isNull(agentProfiles.deletedAtUtc),
          ),
        )
        .limit(1);

      if (!existingAgent) {
        throw new NotFoundError('Agent profile was not found.');
      }

      if (existingAgent.status === 'Terminated') {
        throw new BusinessRuleError('This agent is already terminated.');
      }

      const updatedAt = new Date();

      const orphanedClientRows = await tx
        .update(clientProfiles)
        .set({
          assignedAgentId: null,
          caseStatus: 'Orphan',
          updatedAt,
        })
        .where(eq(clientProfiles.assignedAgentId, existingAgent.id))
        .returning({ id: clientProfiles.id, branchCode: clientProfiles.branchCode });

      if (orphanedClientRows.length > 0) {
        await tx.insert(clientAssignmentHistory).values(
          orphanedClientRows.map((row) => ({
            clientProfileId: row.id,
            fromAgentId: existingAgent.id,
            toAgentId: null,
            actorUserId,
            branchCode: row.branchCode,
            reason: 'Agent delisted; reassigned to orphan handling.',
            createdAtUtc: updatedAt,
          })),
        );
      }

      const migratedNapRows = await tx
        .update(nap)
        .set({
          agentCode: ORPHAN_POOL_AGENT_CODE,
          agentName: 'Orphan Pool',
          updatedAtUtc: updatedAt,
        })
        .where(eq(nap.agentCode, normalizedAgentCode))
        .returning({ id: nap.id });

      const migratedApeRows = await tx
        .update(ape)
        .set({
          agentCode: ORPHAN_POOL_AGENT_CODE,
          updatedAtUtc: updatedAt,
        })
        .where(eq(ape.agentCode, normalizedAgentCode))
        .returning({ id: ape.id });

      await tx
        .update(agentProfiles)
        .set({
          status: 'Terminated',
          updatedAt,
        })
        .where(eq(agentProfiles.id, existingAgent.id));

      await logSystemAudit(
        {
          action: 'agent.delisted',
          userId: actorUserId,
          entityName: 'AgentProfile',
          resourceId: existingAgent.id,
          oldValue: {
            agentCode: existingAgent.agentCode,
            status: existingAgent.status,
          },
          newValue: {
            agentCode: existingAgent.agentCode,
            status: 'Terminated',
            orphanPoolAgentCode: ORPHAN_POOL_AGENT_CODE,
            orphanedClientProfiles: orphanedClientRows.length,
            migratedNapRecords: migratedNapRows.length,
            migratedApeRecords: migratedApeRows.length,
          },
        },
        tx,
      );

      return {
        targetAgentCode: existingAgent.agentCode,
        agentStatus: 'Terminated',
        orphanedClientProfiles: orphanedClientRows.length,
        migratedNapRecords: migratedNapRows.length,
        migratedApeRecords: migratedApeRows.length,
      };
    });
  }
}

export const agentsService = new AgentsService();
