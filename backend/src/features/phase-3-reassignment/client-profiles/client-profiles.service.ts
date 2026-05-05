import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';

import { nanoid } from 'nanoid';
import type { MultipartFile } from '@fastify/multipart';

import type {
  ClientAssignmentHistoryResponse,
  ClientProfile,
  ClientProfileImportResponse,
  ClientProfileReassign,
  ClientProfileReassignIssue,
  ClientProfileReassignPreflightResponse,
  ClientProfileReassignResponse,
  ClientTimelineResponse,
  ListOrphanClientsResponse,
  ListClientProfilesQuery,
  ListClientProfilesResponse,
  UpdateClientCaseStatus,
} from '@a1prime/schemas';
import { db, type DbTransaction, withDbTransaction } from '@/db/client';
import {
  agentProfiles,
  clientAssignmentHistory,
  clientProfiles,
  cosafApprovals,
  documentLibrary,
  notifications,
  systemAuditLogs,
  userAccounts,
} from '@/schema';
import { BusinessRuleError, ForbiddenError, NotFoundError } from '@/lib/errors';
import type { AuthTokenPayload } from '@/shared/lib/auth';
import { emailQueueService } from '@/features/notifications/email-queue.service';
import { r2Service } from '@/lib/r2';
import { decryptEmail } from '@/shared/lib/encryption';

type ClientProfileRow = {
  id: string;
  assignedAgentId: string | null;
  branchCode: string;
  firstName: string;
  lastName: string;
  policyNumber: string;
  productType: string | null;
  planCode: string | null;
  modalPremium: string;
  api: string;
  sumAssured: string;
  commissionAmount: string;
  caseStatus: ClientProfile['caseStatus'];
  policyStatus: ClientProfile['policyStatus'];
  createdAtUtc: Date;
  updatedAtUtc: Date;
  searchRank?: number | null;
};

type AgentLookupRow = {
  id: string;
  displayName: string;
  email: string;
  branchCode: string;
};

const MAX_IMPORT_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const IMPORT_URL_EXPIRY_SECONDS = 15 * 60;
const ALLOWED_IMPORT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
type AllowedImportMimeType = (typeof ALLOWED_IMPORT_MIME_TYPES)[number];
const NON_REASSIGNABLE_CASE_STATUSES = new Set<ClientProfile['caseStatus']>(['BM Signed', 'Done']);
const AGENT_EDITABLE_STATUSES = new Set<ClientProfile['caseStatus']>(['Uncontacted', 'Contacted', 'Returned']);
const MANAGER_EDITABLE_STATUSES = new Set<ClientProfile['caseStatus']>(['Contacted', 'Forms Submitted', 'BM Signed', 'Done', 'Returned']);

export class ClientProfilesService {
  private async getActorBranchCode(actorUser: AuthTokenPayload): Promise<string | null> {
    if (!actorUser.agentId) {
      return null;
    }

    const [record] = await db
      .select({ branchCode: agentProfiles.branchCode })
      .from(agentProfiles)
      .where(and(eq(agentProfiles.id, actorUser.agentId), isNull(agentProfiles.deletedAtUtc)))
      .limit(1);

    return record?.branchCode ?? null;
  }

  private async getAuthorizedClient(
    clientProfileId: string,
    actorUser: AuthTokenPayload,
  ) {
    const [client] = await db
      .select({
        id: clientProfiles.id,
        assignedAgentId: clientProfiles.assignedAgentId,
        branchCode: clientProfiles.branchCode,
        caseStatus: clientProfiles.caseStatus,
        firstName: clientProfiles.firstName,
        lastName: clientProfiles.lastName,
        policyNumber: clientProfiles.policyNumber,
      })
      .from(clientProfiles)
      .where(and(eq(clientProfiles.id, clientProfileId), isNull(clientProfiles.deletedAtUtc)))
      .limit(1);

    if (!client) {
      throw new NotFoundError('Client profile was not found.');
    }

    if (actorUser.role === 'Agent') {
      if (!actorUser.agentId || client.assignedAgentId !== actorUser.agentId) {
        throw new ForbiddenError('Agents can only access their own assigned clients.');
      }
    } else if (actorUser.role === 'BranchManager') {
      const actorBranchCode = await this.getActorBranchCode(actorUser);

      if (!actorBranchCode || client.branchCode !== actorBranchCode) {
        throw new ForbiddenError('Branch Managers can only access clients in their own branch.');
      }
    }

    return client;
  }

  async getClientAssignmentHistory(
    clientProfileId: string,
    actorUser: AuthTokenPayload,
  ): Promise<ClientAssignmentHistoryResponse> {
    await this.getAuthorizedClient(clientProfileId, actorUser);

    const rows = await db
      .select({
        id: clientAssignmentHistory.id,
        clientProfileId: clientAssignmentHistory.clientProfileId,
        fromAgentId: clientAssignmentHistory.fromAgentId,
        toAgentId: clientAssignmentHistory.toAgentId,
        branchCode: clientAssignmentHistory.branchCode,
        reason: clientAssignmentHistory.reason,
        createdAtUtc: clientAssignmentHistory.createdAtUtc,
      })
      .from(clientAssignmentHistory)
      .where(eq(clientAssignmentHistory.clientProfileId, clientProfileId))
      .orderBy(desc(clientAssignmentHistory.createdAtUtc));

    const agentIds = [...new Set(rows.flatMap((row) => [row.fromAgentId, row.toAgentId]).filter(Boolean))] as string[];
    const agents = agentIds.length
      ? await db
          .select({
            id: agentProfiles.id,
            displayName: agentProfiles.displayName,
          })
          .from(agentProfiles)
          .where(inArray(agentProfiles.id, agentIds))
      : [];
    const agentNameById = new Map(agents.map((agent) => [agent.id, agent.displayName]));

    return {
      data: rows.map((row) => ({
        id: row.id,
        clientProfileId: row.clientProfileId,
        fromAgentId: row.fromAgentId,
        toAgentId: row.toAgentId,
        fromAgentName: row.fromAgentId ? agentNameById.get(row.fromAgentId) ?? null : null,
        toAgentName: row.toAgentId ? agentNameById.get(row.toAgentId) ?? null : null,
        branchCode: row.branchCode,
        reason: row.reason,
        createdAtUtc: row.createdAtUtc.toISOString(),
      })),
    };
  }

  async getClientTimeline(
    clientProfileId: string,
    actorUser: AuthTokenPayload,
  ): Promise<ClientTimelineResponse> {
    await this.getAuthorizedClient(clientProfileId, actorUser);

    const [assignmentRows, auditRows, approvalRows, notificationRows, documentRows] = await Promise.all([
      db
        .select({
          id: clientAssignmentHistory.id,
          fromAgentId: clientAssignmentHistory.fromAgentId,
          toAgentId: clientAssignmentHistory.toAgentId,
          reason: clientAssignmentHistory.reason,
          branchCode: clientAssignmentHistory.branchCode,
          createdAtUtc: clientAssignmentHistory.createdAtUtc,
        })
        .from(clientAssignmentHistory)
        .where(eq(clientAssignmentHistory.clientProfileId, clientProfileId)),
      db
        .select({
          id: systemAuditLogs.id,
          action: systemAuditLogs.action,
          actorUserId: systemAuditLogs.actorUserId,
          oldValue: systemAuditLogs.oldValue,
          newValue: systemAuditLogs.newValue,
          createdAtUtc: systemAuditLogs.createdAt,
        })
        .from(systemAuditLogs)
        .where(and(eq(systemAuditLogs.entityName, 'ClientProfile'), eq(systemAuditLogs.entityId, clientProfileId))),
      db
        .select({
          id: cosafApprovals.id,
          reviewingBmId: cosafApprovals.reviewingBmId,
          status: cosafApprovals.status,
          reason: cosafApprovals.reason,
          createdAtUtc: cosafApprovals.createdAtUtc,
        })
        .from(cosafApprovals)
        .where(eq(cosafApprovals.clientProfileId, clientProfileId)),
      db
        .select({
          id: notifications.id,
          userId: notifications.userId,
          subject: notifications.subject,
          message: notifications.message,
          createdAtUtc: notifications.createdAtUtc,
        })
        .from(notifications)
        .where(sql`${notifications.metadata} ilike ${`%${clientProfileId}%`}`),
      db
        .select({
          id: documentLibrary.id,
          uploadedByUserId: documentLibrary.uploadedByUserId,
          fileName: documentLibrary.fileName,
          category: documentLibrary.category,
          version: documentLibrary.version,
          createdAtUtc: documentLibrary.createdAtUtc,
        })
        .from(documentLibrary)
        .where(sql`${documentLibrary.fileName} ilike ${`%${clientProfileId}%`}`),
    ]);

    const actorIds = [
      ...new Set([
        ...auditRows.map((row) => row.actorUserId).filter(Boolean),
        ...approvalRows.map((row) => row.reviewingBmId),
        ...notificationRows.map((row) => row.userId).filter(Boolean),
        ...documentRows.map((row) => row.uploadedByUserId),
      ]),
    ] as string[];

    const actorRows = actorIds.length
      ? await db
          .select({
            id: userAccounts.id,
            firstName: userAccounts.firstName,
            lastName: userAccounts.lastName,
          })
          .from(userAccounts)
          .where(inArray(userAccounts.id, actorIds))
      : [];
    const actorNameById = new Map(
      actorRows.map((row) => [row.id, `${row.firstName} ${row.lastName}`.trim()]),
    );

    return {
      data: [
        ...assignmentRows.map((row) => ({
          id: row.id,
          type: 'assignment' as const,
          action: 'client.assignment',
          actorUserId: null,
          actorName: null,
          title: 'Client ownership changed',
          description: `${row.reason ?? 'Assignment updated.'} Branch ${row.branchCode}.`,
          metadata: {
            branchCode: row.branchCode,
            fromAgentId: row.fromAgentId,
            toAgentId: row.toAgentId,
          },
          createdAtUtc: row.createdAtUtc.toISOString(),
        })),
        ...auditRows.map((row) => ({
          id: row.id,
          type: row.action.includes('status') ? ('status' as const) : ('audit' as const),
          action: row.action,
          actorUserId: row.actorUserId,
          actorName: row.actorUserId ? actorNameById.get(row.actorUserId) ?? null : null,
          title: row.action.replace(/[.-]/g, ' '),
          description: String(
            row.newValue?.summary ??
              row.newValue?.reason ??
              row.newValue?.caseStatus ??
              row.oldValue?.caseStatus ??
              'Client workflow updated.',
          ),
          metadata: (row.newValue ?? row.oldValue ?? null) as Record<string, unknown> | null,
          createdAtUtc: row.createdAtUtc.toISOString(),
        })),
        ...approvalRows.map((row) => ({
          id: row.id,
          type: 'approval' as const,
          action: `cosaf.${String(row.status).toLowerCase()}`,
          actorUserId: row.reviewingBmId,
          actorName: actorNameById.get(row.reviewingBmId) ?? null,
          title: `COSAF ${String(row.status).toLowerCase()}`,
          description: row.reason ?? 'COSAF review updated.',
          metadata: {
            status: row.status,
            reason: row.reason,
          },
          createdAtUtc: row.createdAtUtc.toISOString(),
        })),
        ...notificationRows.map((row) => ({
          id: row.id,
          type: 'notification' as const,
          action: 'notification.sent',
          actorUserId: row.userId,
          actorName: row.userId ? actorNameById.get(row.userId) ?? null : null,
          title: row.subject,
          description: row.message,
          metadata: null,
          createdAtUtc: row.createdAtUtc.toISOString(),
        })),
        ...documentRows.map((row) => ({
          id: row.id,
          type: 'document' as const,
          action: 'document.uploaded',
          actorUserId: row.uploadedByUserId,
          actorName: actorNameById.get(row.uploadedByUserId) ?? null,
          title: `${row.category} uploaded`,
          description: `${row.fileName} (v${row.version})`,
          metadata: {
            category: row.category,
            version: row.version,
          },
          createdAtUtc: row.createdAtUtc.toISOString(),
        })),
      ].sort((left, right) => right.createdAtUtc.localeCompare(left.createdAtUtc)),
    };
  }

  async listOrphanClients(actorUser: AuthTokenPayload): Promise<ListOrphanClientsResponse> {
    const conditions = [
      isNull(clientProfiles.deletedAtUtc),
      isNull(clientProfiles.assignedAgentId),
      eq(clientProfiles.caseStatus, 'Orphan'),
    ];

    if (actorUser.role === 'BranchManager') {
      const actorBranchCode = await this.getActorBranchCode(actorUser);

      if (!actorBranchCode) {
        throw new ForbiddenError('Branch Managers can only view orphan clients in their own branch.');
      }

      conditions.push(eq(clientProfiles.branchCode, actorBranchCode));
    }

    const rows = await db
      .select({
        id: clientProfiles.id,
        assignedAgentId: clientProfiles.assignedAgentId,
        branchCode: clientProfiles.branchCode,
        firstName: clientProfiles.firstName,
        lastName: clientProfiles.lastName,
        policyNumber: clientProfiles.policyNumber,
        productType: clientProfiles.productType,
        planCode: clientProfiles.planCode,
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
      .where(and(...conditions))
      .orderBy(desc(clientProfiles.updatedAt), desc(clientProfiles.createdAt));

    return {
      data: rows.map((row) => this.mapClientProfile(row)),
      meta: {
        total: rows.length,
      },
    };
  }

  async listClientProfiles(
    query: ListClientProfilesQuery,
    actorUser: AuthTokenPayload,
  ): Promise<ListClientProfilesResponse> {
    const page = query.page;
    const pageSize = query.pageSize;
    const offset = (page - 1) * pageSize;
    const conditions = [isNull(clientProfiles.deletedAtUtc)];
    const trimmedSearch = query.search?.trim();

    if (actorUser.role === 'Agent') {
      if (!actorUser.agentId) {
        throw new ForbiddenError('Agents must be linked to an agent profile.');
      }

      conditions.push(eq(clientProfiles.assignedAgentId, actorUser.agentId));
    } else if (actorUser.role === 'BranchManager') {
      const actorBranchCode = await this.getActorBranchCode(actorUser);

      if (!actorBranchCode) {
        throw new ForbiddenError('Branch Managers must be linked to a branch profile.');
      }

      conditions.push(eq(clientProfiles.branchCode, actorBranchCode));
    } else if (query.agentId) {
      conditions.push(eq(clientProfiles.assignedAgentId, query.agentId));
    }

    if (query.branchCode) {
      conditions.push(eq(clientProfiles.branchCode, query.branchCode));
    }

    if (query.status) {
      conditions.push(eq(clientProfiles.caseStatus, query.status));
    }

    if (query.product) {
      conditions.push(eq(clientProfiles.productType, query.product));
    }

    if (trimmedSearch) {
      conditions.push(
        or(
          sql<boolean>`"ClientProfiles"."SearchVector" @@ websearch_to_tsquery('simple', ${trimmedSearch})`,
          sql<boolean>`"ClientProfiles"."PolicyNumber" ILIKE ${`%${trimmedSearch}%`}`,
        )!,
      );
    }

    const whereClause = and(...conditions);
    const searchRank = trimmedSearch
      ? sql<number>`ts_rank_cd("ClientProfiles"."SearchVector", websearch_to_tsquery('simple', ${trimmedSearch}))`
      : sql<number>`0`;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: clientProfiles.id,
          assignedAgentId: clientProfiles.assignedAgentId,
          branchCode: clientProfiles.branchCode,
          firstName: clientProfiles.firstName,
          lastName: clientProfiles.lastName,
          policyNumber: clientProfiles.policyNumber,
          productType: clientProfiles.productType,
          planCode: clientProfiles.planCode,
          modalPremium: clientProfiles.modalPremium,
          api: clientProfiles.api,
          sumAssured: clientProfiles.sumAssured,
          commissionAmount: clientProfiles.commissionAmount,
          caseStatus: clientProfiles.caseStatus,
          policyStatus: clientProfiles.policyStatus,
          createdAtUtc: clientProfiles.createdAt,
          updatedAtUtc: clientProfiles.updatedAt,
          searchRank,
        })
        .from(clientProfiles)
        .where(whereClause)
        .orderBy(
          trimmedSearch
            ? sql`ts_rank_cd("ClientProfiles"."SearchVector", websearch_to_tsquery('simple', ${trimmedSearch})) DESC`
            : desc(clientProfiles.updatedAt),
          desc(clientProfiles.updatedAt),
          desc(clientProfiles.createdAt),
        )
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
    const { fileTypeFromBuffer } = await import('file-type');
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

  async reassignClientProfiles(
    input: ClientProfileReassign,
    actorUser: AuthTokenPayload,
  ): Promise<ClientProfileReassignResponse> {
    const preflight = await this.preflightReassignment(input, actorUser);

    if (!preflight.ok) {
      throw new BusinessRuleError(preflight.issues[0]?.message ?? 'Reassignment preflight failed.');
    }

    return withDbTransaction('cosaf.reassign-profiles', async (tx) => {
      const actorBranchCode =
        actorUser.role === 'BranchManager' ? await this.getActorBranchCode(actorUser) : null;
      const [sourceAgent, destinationAgent] = await Promise.all([
        preflight.sourceAgentId ? this.findActiveAgent(tx, preflight.sourceAgentId) : null,
        preflight.destinationAgentId ? this.findActiveAgent(tx, preflight.destinationAgentId) : null,
      ]);

      if (preflight.sourceAgentId && !sourceAgent) {
        throw new NotFoundError('Source agent was not found.');
      }

      if (input.destinationAgentId && !destinationAgent) {
        throw new NotFoundError('Destination agent was not found.');
      }

      if (
        actorUser.role === 'BranchManager' &&
        actorBranchCode &&
        destinationAgent &&
        destinationAgent.branchCode !== actorBranchCode
      ) {
        throw new ForbiddenError('Branch Managers can only reassign orphan clients within their own branch.');
      }

      const rows = await tx
        .select({
          id: clientProfiles.id,
          assignedAgentId: clientProfiles.assignedAgentId,
          branchCode: clientProfiles.branchCode,
        })
        .from(clientProfiles)
        .where(
          preflight.sourceAgentId
            ? and(
                inArray(clientProfiles.id, preflight.validClientProfileIds),
                eq(clientProfiles.assignedAgentId, preflight.sourceAgentId),
                isNull(clientProfiles.deletedAtUtc),
                actorUser.role === 'BranchManager' && actorBranchCode
                  ? eq(clientProfiles.branchCode, actorBranchCode)
                  : undefined,
              )
            : and(
                inArray(clientProfiles.id, preflight.validClientProfileIds),
                isNull(clientProfiles.assignedAgentId),
                isNull(clientProfiles.deletedAtUtc),
                actorUser.role === 'BranchManager' && actorBranchCode
                  ? eq(clientProfiles.branchCode, actorBranchCode)
                  : undefined,
              ),
        );

      const updatedAt = new Date();

      await tx
        .update(clientProfiles)
        .set({
          assignedAgentId: preflight.destinationAgentId,
          caseStatus: preflight.destinationAgentId ? 'Uncontacted' : 'Orphan',
          updatedAt,
        })
        .where(inArray(clientProfiles.id, preflight.validClientProfileIds));

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
            assignedAgentId: preflight.destinationAgentId,
            caseStatus: preflight.destinationAgentId ? 'Uncontacted' : 'Orphan',
          },
        })),
      );

      const historyRows = await tx
        .select({
          id: clientProfiles.id,
          branchCode: clientProfiles.branchCode,
        })
        .from(clientProfiles)
        .where(inArray(clientProfiles.id, preflight.validClientProfileIds));

      await tx.insert(clientAssignmentHistory).values(
        rows.map((row) => ({
          clientProfileId: row.id,
          fromAgentId: row.assignedAgentId,
          toAgentId: preflight.destinationAgentId,
          actorUserId: actorUser.sub,
          branchCode: historyRows.find((historyRow) => historyRow.id === row.id)?.branchCode ?? 'UNASSIGNED',
          reason: preflight.destinationAgentId
            ? 'Manual reassignment completed.'
            : 'Client moved to orphan handling.',
          createdAtUtc: updatedAt,
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

  async updateClientCaseStatus(
    clientProfileId: string,
    input: UpdateClientCaseStatus,
    actorUser: AuthTokenPayload,
  ): Promise<ClientProfile> {
    const client = await this.getAuthorizedClient(clientProfileId, actorUser);
    const nextStatus = input.caseStatus;
    const previousStatus = client.caseStatus;

    if (actorUser.role === 'Agent' && !AGENT_EDITABLE_STATUSES.has(nextStatus)) {
      throw new ForbiddenError('Agents cannot move a client into that status directly.');
    }

    if (actorUser.role !== 'Agent' && !MANAGER_EDITABLE_STATUSES.has(nextStatus)) {
      throw new ForbiddenError('That status must be driven by workflow automation.');
    }

    if (nextStatus === 'Returned' && !input.reason?.trim()) {
      throw new BusinessRuleError('Returned cases require a reason.');
    }

    if (previousStatus === 'Done') {
      throw new BusinessRuleError('Completed cases cannot be moved to another status.');
    }

    const allowedTransition =
      (previousStatus === 'Uncontacted' && nextStatus === 'Contacted') ||
      (previousStatus === 'BM Signed' && nextStatus === 'Done') ||
      (previousStatus === 'Returned' && nextStatus === 'Contacted') ||
      previousStatus === nextStatus;

    if (!allowedTransition) {
      throw new BusinessRuleError(
        `The transition from ${previousStatus} to ${nextStatus} is not allowed from this action.`,
      );
    }

    const updatedAt = new Date();
    const [updated] = await db
      .update(clientProfiles)
      .set({
        caseStatus: nextStatus,
        updatedAt,
      })
      .where(eq(clientProfiles.id, clientProfileId))
      .returning({
        id: clientProfiles.id,
        assignedAgentId: clientProfiles.assignedAgentId,
        branchCode: clientProfiles.branchCode,
        firstName: clientProfiles.firstName,
        lastName: clientProfiles.lastName,
        policyNumber: clientProfiles.policyNumber,
        productType: clientProfiles.productType,
        planCode: clientProfiles.planCode,
        modalPremium: clientProfiles.modalPremium,
        api: clientProfiles.api,
        sumAssured: clientProfiles.sumAssured,
        commissionAmount: clientProfiles.commissionAmount,
        caseStatus: clientProfiles.caseStatus,
        policyStatus: clientProfiles.policyStatus,
        createdAtUtc: clientProfiles.createdAt,
        updatedAtUtc: clientProfiles.updatedAt,
      });

    await db.insert(systemAuditLogs).values({
      actorUserId: actorUser.sub,
      action: 'client-profile.status-updated',
      entityName: 'ClientProfile',
      entityId: clientProfileId,
      oldValue: {
        caseStatus: previousStatus,
      },
      newValue: {
        caseStatus: nextStatus,
        reason: input.reason?.trim() || null,
        summary: `Status moved from ${previousStatus} to ${nextStatus}.`,
      },
    });

    return this.mapClientProfile(updated);
  }

  async preflightReassignment(
    input: ClientProfileReassign,
    actorUser: AuthTokenPayload,
  ): Promise<ClientProfileReassignPreflightResponse> {
    const issues: ClientProfileReassignIssue[] = [];
    const actorBranchCode =
      actorUser.role === 'BranchManager' ? await this.getActorBranchCode(actorUser) : null;
    const sourceAgent = input.sourceAgentId ? await this.findActiveAgent(db, input.sourceAgentId) : null;
    const destinationAgent = input.destinationAgentId
      ? await this.findActiveAgent(db, input.destinationAgentId)
      : null;

    if (input.sourceAgentId && !sourceAgent) {
      issues.push({
        code: 'SOURCE_AGENT_NOT_FOUND',
        message: 'Select a valid source agent before continuing.',
      });
    }

    if (input.destinationAgentId && !destinationAgent) {
      issues.push({
        code: 'DESTINATION_AGENT_NOT_FOUND',
        message: 'Select a valid destination agent before continuing.',
      });
    }

    if (
      actorUser.role === 'BranchManager' &&
      actorBranchCode &&
      ((sourceAgent && sourceAgent.branchCode !== actorBranchCode) ||
        (destinationAgent && destinationAgent.branchCode !== actorBranchCode))
    ) {
      issues.push({
        code: 'CLIENT_OWNERSHIP_MISMATCH',
        message: 'Branch Managers can only move clients between agents in their own branch.',
      });
    }

    if (
      input.sourceAgentId &&
      input.destinationAgentId &&
      input.destinationAgentId === input.sourceAgentId
    ) {
      issues.push({
        code: 'DESTINATION_MATCHES_SOURCE',
        message: 'Destination agent must be different from the source agent.',
      });
    }

    const rows = await db
      .select({
        id: clientProfiles.id,
        assignedAgentId: clientProfiles.assignedAgentId,
        branchCode: clientProfiles.branchCode,
        caseStatus: clientProfiles.caseStatus,
      })
      .from(clientProfiles)
      .where(inArray(clientProfiles.id, input.clientProfileIds));

    const rowsById = new Map(rows.map((row) => [row.id, row]));
    const validClientProfileIds: string[] = [];

    for (const clientProfileId of input.clientProfileIds) {
      const row = rowsById.get(clientProfileId);

      if (!row) {
        issues.push({
          code: 'CLIENT_PROFILE_NOT_FOUND',
          message: 'One or more selected client profiles no longer exist.',
          clientProfileId,
        });
        continue;
      }

      const ownershipMatches = input.sourceAgentId
        ? row.assignedAgentId === input.sourceAgentId
        : row.assignedAgentId === null;

      if (!ownershipMatches) {
        issues.push({
          code: 'CLIENT_OWNERSHIP_MISMATCH',
          message: input.sourceAgentId
            ? 'Selected client profiles must belong to the chosen source agent.'
            : 'Selected client profiles must already be unassigned before they can be mapped to a new agent.',
          clientProfileId,
        });
        continue;
      }

      if (actorUser.role === 'BranchManager' && actorBranchCode && row.branchCode !== actorBranchCode) {
        issues.push({
          code: 'CLIENT_OWNERSHIP_MISMATCH',
          message: 'Selected client profiles must belong to your branch.',
          clientProfileId,
        });
        continue;
      }

      if (input.destinationAgentId && row.assignedAgentId === input.destinationAgentId) {
        issues.push({
          code: 'CLIENT_ALREADY_ASSIGNED_TO_DESTINATION',
          message: 'One or more selected client profiles already belong to the destination agent.',
          clientProfileId,
        });
        continue;
      }

      if (NON_REASSIGNABLE_CASE_STATUSES.has(row.caseStatus)) {
        issues.push({
          code: 'CLIENT_STATUS_NOT_ELIGIBLE',
          message: `Client profiles in ${row.caseStatus} cannot be reassigned.`,
          clientProfileId,
        });
        continue;
      }

      validClientProfileIds.push(clientProfileId);
    }

    return {
      ok: issues.length === 0,
      sourceAgentId: input.sourceAgentId,
      destinationAgentId: input.destinationAgentId,
      totalRequested: input.clientProfileIds.length,
      validClientProfileIds,
      issues,
    };
  }

  private mapClientProfile(row: ClientProfileRow): ClientProfile {
    return {
      id: row.id,
      assignedAgentId: row.assignedAgentId,
      branchCode: row.branchCode,
      firstName: row.firstName,
      lastName: row.lastName,
      policyNumber: row.policyNumber,
      productType: row.productType ?? null,
      planCode: row.planCode ?? null,
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
    tx: DbTransaction | typeof db,
    agentId: string,
  ): Promise<AgentLookupRow | null> {
    const [agent] = await tx
      .select({
        id: agentProfiles.id,
        displayName: agentProfiles.displayName,
        branchCode: agentProfiles.branchCode,
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
            branchCode: agent.branchCode,
          }
        : null;
  }
}

export const clientProfilesService = new ClientProfilesService();
