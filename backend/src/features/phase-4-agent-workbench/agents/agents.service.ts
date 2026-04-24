import { and, asc, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import Decimal from 'decimal.js';
import { fileTypeFromBuffer } from 'file-type';
import type { MultipartFile } from '@fastify/multipart';

import type {
  AgentDashboardResponse,
  AgentLookupResponse,
  AgentProfile,
  AgentStatus,
  BranchManagerDashboardQuery,
  BranchManagerDashboardResponse,
  DelistAgentResponse,
  ListAgentsQuery,
  UpdateAgentProfile,
} from '@a1prime/schemas';
import { db, withDbTransaction } from '@/db/client';
import { ForbiddenError, BusinessRuleError, NotFoundError } from '@/lib/errors';
import {
  agentProfiles,
  ape,
  clientAssignmentHistory,
  clientProfiles,
  cosafApprovals,
  lapsationRecords,
  nap,
  performanceMetrics,
  prospects,
  systemAuditLogs,
  userAccounts,
} from '@/schema';
import type { AuthTokenPayload } from '@/shared/lib/auth';
import { logSystemAudit } from '@/shared/lib/audit';
import { decryptEmail, encryptEmail, hashEmail, normalizeEmail } from '@/shared/lib/encryption';
import { r2Service } from '@/lib/r2';
import { metricsService } from '@/features/phase-5-performance/metrics/metrics.service';

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

function toNumber(value: string | number | null | undefined) {
  return new Decimal(value ?? 0).toNumber();
}

function getRiskLevel(daysSinceLapse: number): 'Warning' | 'Urgent' | 'Lapsed' {
  if (daysSinceLapse >= 90) {
    return 'Lapsed';
  }

  if (daysSinceLapse >= 60) {
    return 'Urgent';
  }

  return 'Warning';
}

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

  async getAgentDashboard(actorUser: AuthTokenPayload): Promise<AgentDashboardResponse> {
    if (!actorUser.agentId) {
      throw new ForbiddenError('Agent dashboard requires a linked agent profile.');
    }

    const record = await this.getAgentProfileRecord(actorUser.agentId);

    if (!record) {
      throw new NotFoundError('Agent profile was not found.');
    }

    const [clients, atRiskRows, performanceRows, historyRows, prospectRows] = await Promise.all([
      db
        .select({
          id: clientProfiles.id,
          firstName: clientProfiles.firstName,
          lastName: clientProfiles.lastName,
          policyNumber: clientProfiles.policyNumber,
          status: clientProfiles.caseStatus,
          productType: clientProfiles.productType,
          planCode: clientProfiles.planCode,
          updatedAtUtc: clientProfiles.updatedAt,
        })
        .from(clientProfiles)
        .where(
          and(
            eq(clientProfiles.assignedAgentId, actorUser.agentId),
            isNull(clientProfiles.deletedAtUtc),
          ),
        )
        .orderBy(desc(clientProfiles.updatedAt)),
      db
        .select({
          id: lapsationRecords.id,
          firstName: clientProfiles.firstName,
          lastName: clientProfiles.lastName,
          policyNumber: clientProfiles.policyNumber,
          lapseDateUtc: lapsationRecords.lapseDateUtc,
        })
        .from(lapsationRecords)
        .innerJoin(clientProfiles, eq(clientProfiles.id, lapsationRecords.policyNumberId))
        .where(
          and(
            eq(clientProfiles.assignedAgentId, actorUser.agentId),
            eq(lapsationRecords.isAtRisk, true),
            isNull(lapsationRecords.reinstatedAtUtc),
            isNull(clientProfiles.deletedAtUtc),
          ),
        )
        .orderBy(desc(lapsationRecords.lapseDateUtc)),
      db
        .select({
          api: performanceMetrics.api,
          ape: performanceMetrics.modalPremium,
          recruitmentCount: performanceMetrics.recruitmentCount,
        })
        .from(performanceMetrics)
        .where(eq(performanceMetrics.agentId, actorUser.agentId))
        .orderBy(desc(performanceMetrics.recordMonth)),
      db
        .select({
          id: clientAssignmentHistory.id,
          reason: clientAssignmentHistory.reason,
          createdAtUtc: clientAssignmentHistory.createdAtUtc,
        })
        .from(clientAssignmentHistory)
        .where(
          or(
            eq(clientAssignmentHistory.fromAgentId, actorUser.agentId),
            eq(clientAssignmentHistory.toAgentId, actorUser.agentId),
          )!,
        )
        .orderBy(desc(clientAssignmentHistory.createdAtUtc))
        .limit(8),
      db
        .select({
          pipelineStage: prospects.pipelineStage,
        })
        .from(prospects)
        .where(eq(prospects.agentCode, record.agentCode)),
    ]);

    const totalApi = performanceRows.reduce((sum, row) => sum + toNumber(row.api), 0);
    const totalApe = performanceRows.reduce((sum, row) => sum + toNumber(row.ape), 0);
    const recruitmentCount = performanceRows.reduce((sum, row) => sum + (row.recruitmentCount ?? 0), 0);
    const policyCount = clients.length;
    const activePolicies = clients.filter((row) => row.status !== 'Done').length;
    const persistency = policyCount > 0 ? Math.max(0, Math.round(((policyCount - atRiskRows.length) / policyCount) * 100)) : 100;

    const atRiskPolicies = atRiskRows.map((row) => {
      const daysSinceLapse = Math.max(0, Math.floor((Date.now() - row.lapseDateUtc.getTime()) / 86400000));
      return {
        id: row.id,
        clientName: `${row.firstName} ${row.lastName}`.trim(),
        policyNumber: row.policyNumber,
        riskLevel: getRiskLevel(daysSinceLapse),
        lapseDateUtc: row.lapseDateUtc.toISOString(),
        daysSinceLapse,
      };
    });

    return {
      generatedAtUtc: new Date().toISOString(),
      agent: {
        id: record.id,
        displayName: record.displayName,
        agentCode: record.agentCode,
        branchCode: record.branchCode,
      },
      summary: {
        persistency,
        activePolicies,
        totalApi,
        totalApe,
        policyCount,
        recruitmentCount,
        warningPolicies: atRiskPolicies.filter((row) => row.riskLevel === 'Warning').length,
        urgentPolicies: atRiskPolicies.filter((row) => row.riskLevel === 'Urgent').length,
        lapsedPolicies: atRiskPolicies.filter((row) => row.riskLevel === 'Lapsed').length,
      },
      assignedClients: clients.map((row) => ({
        id: row.id,
        clientName: `${row.firstName} ${row.lastName}`.trim(),
        policyNumber: row.policyNumber,
        status: row.status,
        productType: row.productType,
        planCode: row.planCode,
        updatedAtUtc: row.updatedAtUtc.toISOString(),
      })),
      recentHistory: historyRows.map((row) => ({
        id: row.id,
        action: 'client.assignment-history',
        actorName: record.displayName,
        timestampUtc: row.createdAtUtc.toISOString(),
        summary: row.reason ?? 'Client assignment changed.',
      })),
      atRiskPolicies,
      prospects: {
        total: prospectRows.length,
        contacted: prospectRows.filter((row) => row.pipelineStage === 'Contacted').length,
        clientAgreed: prospectRows.filter((row) => row.pipelineStage === 'Client Agreed').length,
        presentation: prospectRows.filter((row) => row.pipelineStage === 'Presentation').length,
        approved: prospectRows.filter((row) => row.pipelineStage === 'Approved').length,
        closed: prospectRows.filter((row) => row.pipelineStage === 'Closed').length,
      },
      quickActions: [
        {
          label: 'Update contact status',
          description: 'Move assigned clients across the visible workflow states you are allowed to edit.',
          href: '/dashboard/cosaf',
        },
        {
          label: 'Upload COSAF docs',
          description: 'Submit requirements for BM review without editing imported source records.',
          href: '/dashboard/cosaf',
        },
        {
          label: 'Open at-risk queue',
          description: 'Jump straight into your warning, urgent, and lapsed cases.',
          href: '/dashboard/lapsation',
        },
        {
          label: 'Open prospects',
          description: 'Continue the prospect pipeline from contacted through closed.',
          href: '/dashboard/prospects',
        },
      ],
    };
  }

  async getBranchManagerDashboard(
    actorUser: AuthTokenPayload,
    query: BranchManagerDashboardQuery,
  ): Promise<BranchManagerDashboardResponse> {
    if (!actorUser.agentId) {
      throw new ForbiddenError('Branch Manager dashboard requires a linked branch profile.');
    }

    const manager = await this.getAgentProfileRecord(actorUser.agentId);

    if (!manager) {
      throw new NotFoundError('Branch Manager profile was not found.');
    }

    const month = query.month ?? new Date().getMonth() + 1;
    const year = query.year ?? new Date().getFullYear();
    const recordMonth = `${year}-${String(month).padStart(2, '0')}`;
    const leaderboard = await metricsService.getLeaderboardRows({ month, year }, actorUser);

    const clientConditions = [
      eq(clientProfiles.branchCode, manager.branchCode),
      isNull(clientProfiles.deletedAtUtc),
    ];

    if (query.agentId) {
      clientConditions.push(eq(clientProfiles.assignedAgentId, query.agentId));
    }

    if (query.status) {
      clientConditions.push(eq(clientProfiles.caseStatus, query.status));
    }

    if (query.product) {
      clientConditions.push(eq(clientProfiles.productType, query.product));
    }

    const clientRows = await db
      .select({
        id: clientProfiles.id,
        firstName: clientProfiles.firstName,
        lastName: clientProfiles.lastName,
        policyNumber: clientProfiles.policyNumber,
        assignedAgentId: clientProfiles.assignedAgentId,
        assignedAgentName: agentProfiles.displayName,
        status: clientProfiles.caseStatus,
        productType: clientProfiles.productType,
        updatedAtUtc: clientProfiles.updatedAt,
        lapseDateUtc: lapsationRecords.lapseDateUtc,
        reinstatedAtUtc: lapsationRecords.reinstatedAtUtc,
      })
      .from(clientProfiles)
      .leftJoin(
        agentProfiles,
        and(eq(agentProfiles.id, clientProfiles.assignedAgentId), isNull(agentProfiles.deletedAtUtc)),
      )
      .leftJoin(lapsationRecords, eq(lapsationRecords.policyNumberId, clientProfiles.id))
      .where(and(...clientConditions))
      .orderBy(desc(clientProfiles.updatedAt))
      .limit(50);

    const filteredClients = clientRows
      .map((row) => {
        const lapsationState =
          row.lapseDateUtc && !row.reinstatedAtUtc
            ? getRiskLevel(
                Math.max(0, Math.floor((Date.now() - row.lapseDateUtc.getTime()) / 86400000)),
              )
            : null;

        return {
          id: row.id,
          clientName: `${row.firstName} ${row.lastName}`.trim(),
          policyNumber: row.policyNumber,
          assignedAgentId: row.assignedAgentId,
          assignedAgentName: row.assignedAgentName ?? null,
          status: row.status,
          productType: row.productType,
          lapsationState,
          updatedAtUtc: row.updatedAtUtc.toISOString(),
        };
      })
      .filter((row) => !query.lapsationState || row.lapsationState === query.lapsationState);

    const [
      orphanCountRows,
      pendingCosafRows,
      atRiskRows,
      activeAgentRows,
      totalsRows,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(clientProfiles)
        .where(
          and(
            eq(clientProfiles.branchCode, manager.branchCode),
            isNull(clientProfiles.assignedAgentId),
            eq(clientProfiles.caseStatus, 'Orphan'),
            isNull(clientProfiles.deletedAtUtc),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(cosafApprovals)
        .where(and(eq(cosafApprovals.status, 'PENDING'), eq(cosafApprovals.reviewingBmId, actorUser.id))),
      db
        .select({ lapseDateUtc: lapsationRecords.lapseDateUtc })
        .from(lapsationRecords)
        .innerJoin(clientProfiles, eq(clientProfiles.id, lapsationRecords.policyNumberId))
        .where(
          and(
            eq(clientProfiles.branchCode, manager.branchCode),
            eq(lapsationRecords.isAtRisk, true),
            isNull(lapsationRecords.reinstatedAtUtc),
            isNull(clientProfiles.deletedAtUtc),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(agentProfiles)
        .where(
          and(
            eq(agentProfiles.branchCode, manager.branchCode),
            eq(agentProfiles.status, 'Active'),
            isNull(agentProfiles.deletedAtUtc),
          ),
        ),
      db
        .select({
          totalApi: sql<string>`coalesce(sum(${performanceMetrics.api}), 0)::text`,
          totalApe: sql<string>`coalesce(sum(${performanceMetrics.modalPremium}), 0)::text`,
        })
        .from(performanceMetrics)
        .innerJoin(agentProfiles, eq(agentProfiles.id, performanceMetrics.agentId))
        .where(
          and(
            eq(agentProfiles.branchCode, manager.branchCode),
            eq(performanceMetrics.recordMonth, recordMonth),
            isNull(agentProfiles.deletedAtUtc),
          ),
        ),
    ]);

    const riskSummary = atRiskRows.reduce(
      (acc, row) => {
        const state = getRiskLevel(
          Math.max(0, Math.floor((Date.now() - row.lapseDateUtc.getTime()) / 86400000)),
        );
        acc[state] += 1;
        return acc;
      },
      { Warning: 0, Urgent: 0, Lapsed: 0 } as Record<'Warning' | 'Urgent' | 'Lapsed', number>,
    );

    return {
      generatedAtUtc: new Date().toISOString(),
      branch: {
        branchCode: manager.branchCode,
        month,
        year,
      },
      summary: {
        orphanClientCount: orphanCountRows[0]?.count ?? 0,
        pendingCosafApprovals: pendingCosafRows[0]?.count ?? 0,
        warningPolicies: riskSummary.Warning,
        urgentPolicies: riskSummary.Urgent,
        lapsedPolicies: riskSummary.Lapsed,
        activeAgents: activeAgentRows[0]?.count ?? 0,
        totalApi: toNumber(totalsRows[0]?.totalApi),
        totalApe: toNumber(totalsRows[0]?.totalApe),
      },
      topPerformers: leaderboard.slice(0, 5),
      bottomPerformers: [...leaderboard].reverse().slice(0, 5),
      filteredClients,
    };
  }

  async listAgents(query: ListAgentsQuery, actorUser: AuthTokenPayload): Promise<AgentLookupResponse> {
    const conditions = [isNull(agentProfiles.deletedAtUtc), isNull(userAccounts.deletedAtUtc)];
    const branchCode = actorUser.role === 'BranchManager' ? await this.getActorBranchCode(actorUser) : null;

    if (actorUser.role === 'BranchManager') {
      if (!branchCode) {
        throw new ForbiddenError('Branch Manager lookups require a linked branch profile.');
      }

      conditions.push(eq(agentProfiles.branchCode, branchCode));
    }

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

  async delistAgent(targetAgentCode: string, actorUser: AuthTokenPayload): Promise<DelistAgentResponse> {
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

      if (actorUser.role === 'BranchManager') {
        const actorBranchCode = await this.getActorBranchCode(actorUser);

        if (!actorBranchCode || actorBranchCode !== existingAgent.branchCode) {
          throw new ForbiddenError('Branch Managers can only delist agents in their own branch.');
        }
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
             actorUserId: actorUser.id,
             branchCode: row.branchCode,
             reason: 'Agent delisted; moved into orphan handling.',
             createdAtUtc: updatedAt,
          })),
        );
      }

      const [preservedNapRows, preservedApeRows] = await Promise.all([
        tx.select({ id: nap.id }).from(nap).where(eq(nap.agentCode, normalizedAgentCode)),
        tx.select({ id: ape.id }).from(ape).where(eq(ape.agentCode, normalizedAgentCode)),
      ]);

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
           userId: actorUser.id,
           entityName: 'AgentProfile',
          resourceId: existingAgent.id,
          oldValue: {
            agentCode: existingAgent.agentCode,
            status: existingAgent.status,
          },
          newValue: {
            agentCode: existingAgent.agentCode,
            status: 'Terminated',
            orphanedClientProfiles: orphanedClientRows.length,
            preservedImportedNapRecords: preservedNapRows.length,
            preservedImportedApeRecords: preservedApeRows.length,
          },
        },
        tx,
      );

      return {
        targetAgentCode: existingAgent.agentCode,
        agentStatus: 'Terminated',
        orphanedClientProfiles: orphanedClientRows.length,
        preservedImportedNapRecords: preservedNapRows.length,
        preservedImportedApeRecords: preservedApeRows.length,
      };
    });
  }
}

export const agentsService = new AgentsService();
