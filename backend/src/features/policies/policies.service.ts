import {
  and,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import type { ManualPolicyInput, UpdateManualPolicy, ListManualPoliciesQuery } from '@a1prime/schemas';

import { db, withDbTransaction } from '@/db/client';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors';
import {
  agentProfiles,
  planCodes,
  policies,
  policyStatusHistory,
  systemAuditLogs,
  userAccounts,
} from '@/schema';
import { logSystemAudit } from '@/shared/lib/audit';
import type { AuthTokenPayload } from '@/shared/lib/auth';

interface PolicyListRow {
  id: string;
  clientProfileId: string | null;
  assignedAgentId: string | null;
  agentCode: string | null;
  agentName: string | null;
  branchCode: string;
  policyNumber: string;
  policyOwnerName: string | null;
  lifeInsuredName: string | null;
  planCode: string | null;
  planName: string | null;
  currency: string;
  firstIssueDate: string | null;
  mode: string | null;
  modalPremium: string;
  sumAssured: string;
  api: string;
  policyStatus: string;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

interface PolicyStatusTimelineItem {
  id: string;
  previousStatus: string | null;
  nextStatus: string;
  effectiveAtUtc: string;
  reason: string | null;
  notes: string | null;
  changedByName: string | null;
  metadata: Record<string, unknown> | null;
}

interface PolicyAuditTimelineItem {
  id: string;
  action: string;
  timestampUtc: string;
  actorName: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
}

export interface PolicyListItem extends PolicyListRow {
  validationIssues: string[];
}

export interface PolicyListResponse {
  data: PolicyListItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface PolicyDetailResponse extends PolicyListItem {
  timeline: {
    statusHistory: PolicyStatusTimelineItem[];
    auditEvents: PolicyAuditTimelineItem[];
  };
}

function fullName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || null;
}

function toDateOnly(value: Date | string | null) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return value.toISOString().slice(0, 10);
}

function formatPolicyListRow(
  row: {
    id: string;
    clientProfileId: string | null;
    assignedAgentId: string | null;
    agentCode: string | null;
    agentFirstName: string | null;
    agentLastName: string | null;
    branchCode: string;
    policyNumber: string;
    policyOwnerName: string | null;
    lifeInsuredName: string | null;
    planCode: string | null;
    planName: string | null;
    currency: string;
    firstIssueDate: string | Date | null;
    mode: string | null;
    modalPremium: string;
    sumAssured: string;
    api: string;
    policyStatus: string;
    notes: string | null;
    createdAtUtc: Date;
    updatedAtUtc: Date;
  },
  validationIssues: string[],
): PolicyListItem {
  return {
    id: row.id,
    clientProfileId: row.clientProfileId,
    assignedAgentId: row.assignedAgentId,
    agentCode: row.agentCode,
    agentName: fullName(row.agentFirstName, row.agentLastName),
    branchCode: row.branchCode,
    policyNumber: row.policyNumber,
    policyOwnerName: row.policyOwnerName,
    lifeInsuredName: row.lifeInsuredName,
    planCode: row.planCode,
    planName: row.planName,
    currency: row.currency,
    firstIssueDate: toDateOnly(row.firstIssueDate),
    mode: row.mode,
    modalPremium: row.modalPremium,
    sumAssured: row.sumAssured,
    api: row.api,
    policyStatus: row.policyStatus,
    notes: row.notes,
    createdAtUtc: row.createdAtUtc.toISOString(),
    updatedAtUtc: row.updatedAtUtc.toISOString(),
    validationIssues,
  };
}

export class PoliciesService {
  private async getActorBranchCode(actor: AuthTokenPayload): Promise<string | null> {
    if (!actor.agentId) {
      return null;
    }

    const [record] = await db
      .select({ branchCode: agentProfiles.branchCode })
      .from(agentProfiles)
      .where(and(eq(agentProfiles.id, actor.agentId), isNull(agentProfiles.deletedAtUtc)))
      .limit(1);

    return record?.branchCode ?? null;
  }

  private async assertReadableScope(actor: AuthTokenPayload, policyId: string) {
    const conditions = [eq(policies.id, policyId)];

    if (actor.role === 'Agent') {
      if (!actor.agentId) {
        throw new ForbiddenError('Agents must be linked to an agent profile.');
      }

      conditions.push(eq(policies.assignedAgentId, actor.agentId));
    } else if (actor.role === 'BranchManager') {
      const branchCode = await this.getActorBranchCode(actor);

      if (!branchCode) {
        throw new ForbiddenError('Branch Managers must be linked to a branch profile.');
      }

      conditions.push(eq(policies.branchCode, branchCode));
    }

    const [row] = await db.select({ id: policies.id }).from(policies).where(and(...conditions)).limit(1);

    if (!row) {
      throw new NotFoundError('Policy not found.');
    }
  }

  private async validateAgent(agentId: string | undefined) {
    if (!agentId) {
      return null;
    }

    const [agent] = await db
      .select({
        id: agentProfiles.id,
        branchCode: agentProfiles.branchCode,
      })
      .from(agentProfiles)
      .where(and(eq(agentProfiles.id, agentId), isNull(agentProfiles.deletedAtUtc), eq(agentProfiles.status, 'Active')))
      .limit(1);

    if (!agent) {
      throw new BadRequestError('Assigned agent does not exist.');
    }

    return agent;
  }

  private async validatePlanCode(planCode: string | undefined) {
    if (!planCode) {
      return null;
    }

    const [plan] = await db
      .select({
        planCode: planCodes.planCode,
        planName: planCodes.planName,
        isActive: planCodes.isActive,
      })
      .from(planCodes)
      .where(eq(planCodes.planCode, planCode))
      .limit(1);

    if (!plan || !plan.isActive) {
      throw new BadRequestError(`Plan code ${planCode} is invalid or inactive.`);
    }

    return plan;
  }

  private async assertUniquePolicyNumber(policyNumber: string, excludePolicyId?: string) {
    const conditions = [eq(policies.policyNumber, policyNumber)];

    if (excludePolicyId) {
      conditions.push(ne(policies.id, excludePolicyId));
    }

    const [existing] = await db
      .select({ id: policies.id })
      .from(policies)
      .where(and(...conditions))
      .limit(1);

    if (existing) {
      throw new BadRequestError(`Policy number ${policyNumber} already exists.`);
    }
  }

  private buildListConditions(input: ListManualPoliciesQuery, actor: AuthTokenPayload, branchCode: string | null) {
    const conditions = [];

    if (actor.role === 'Agent') {
      if (!actor.agentId) {
        throw new ForbiddenError('Agents must be linked to an agent profile.');
      }

      conditions.push(eq(policies.assignedAgentId, actor.agentId));
    } else if (actor.role === 'BranchManager') {
      if (!branchCode) {
        throw new ForbiddenError('Branch Managers must be linked to a branch profile.');
      }

      conditions.push(eq(policies.branchCode, branchCode));
    }

    if (input.agentId && actor.role === 'Admin') {
      conditions.push(eq(policies.assignedAgentId, input.agentId));
    }

    if (input.branchCode && actor.role === 'Admin') {
      conditions.push(eq(policies.branchCode, input.branchCode));
    }

    if (input.planCode) {
      conditions.push(eq(policies.planCode, input.planCode.toUpperCase()));
    }

    if (input.policyStatus) {
      conditions.push(eq(policies.policyStatus, input.policyStatus));
    }

    if (input.issuedFrom) {
      conditions.push(gte(policies.firstIssueDate, input.issuedFrom));
    }

    if (input.issuedTo) {
      conditions.push(lte(policies.firstIssueDate, input.issuedTo));
    }

    if (input.search) {
      const term = `%${input.search}%`;
      conditions.push(
        or(
          ilike(policies.policyNumber, term),
          ilike(policies.policyOwnerName, term),
          ilike(policies.lifeInsuredName, term),
          ilike(agentProfiles.agentCode, term),
          ilike(userAccounts.firstName, term),
          ilike(userAccounts.lastName, term),
        )!,
      );
    }

    return conditions;
  }

  private getValidationIssues(row: { assignedAgentId: string | null; agentCode: string | null; planCode: string | null; planName: string | null; }) {
    const issues: string[] = [];

    if (!row.assignedAgentId || !row.agentCode) {
      issues.push('Assigned agent reference is missing.');
    }

    if (row.planCode && !row.planName) {
      issues.push('Plan name could not be resolved from the active plan code catalog.');
    }

    return issues;
  }

  async listPolicies(input: ListManualPoliciesQuery, actor: AuthTokenPayload): Promise<PolicyListResponse> {
    const page = input.page;
    const pageSize = input.pageSize;
    const offset = (page - 1) * pageSize;
    const branchCode = actor.role === 'BranchManager' ? await this.getActorBranchCode(actor) : null;
    const conditions = this.buildListConditions(input, actor, branchCode);
    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: policies.id,
          clientProfileId: policies.clientProfileId,
          assignedAgentId: policies.assignedAgentId,
          agentCode: agentProfiles.agentCode,
          agentFirstName: userAccounts.firstName,
          agentLastName: userAccounts.lastName,
          branchCode: policies.branchCode,
          policyNumber: policies.policyNumber,
          policyOwnerName: policies.policyOwnerName,
          lifeInsuredName: policies.lifeInsuredName,
          planCode: policies.planCode,
          planName: policies.planName,
          currency: policies.currency,
          firstIssueDate: policies.firstIssueDate,
          mode: policies.mode,
          modalPremium: sql<string>`${policies.modalPremium}::text`,
          sumAssured: sql<string>`${policies.sumAssured}::text`,
          api: sql<string>`${policies.api}::text`,
          policyStatus: policies.policyStatus,
          notes: policies.notes,
          createdAtUtc: policies.createdAtUtc,
          updatedAtUtc: policies.updatedAtUtc,
        })
        .from(policies)
        .leftJoin(agentProfiles, eq(policies.assignedAgentId, agentProfiles.id))
        .leftJoin(userAccounts, eq(agentProfiles.userId, userAccounts.id))
        .where(whereClause)
        .orderBy(desc(policies.updatedAtUtc), desc(policies.createdAtUtc))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(policies)
        .leftJoin(agentProfiles, eq(policies.assignedAgentId, agentProfiles.id))
        .leftJoin(userAccounts, eq(agentProfiles.userId, userAccounts.id))
        .where(whereClause),
    ]);

    const total = totalRows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      data: rows.map((row) => formatPolicyListRow(row, this.getValidationIssues(row))),
      meta: {
        total,
        page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getPolicyDetail(policyId: string, actor: AuthTokenPayload): Promise<PolicyDetailResponse> {
    await this.assertReadableScope(actor, policyId);

    const [row] = await db
      .select({
        id: policies.id,
        clientProfileId: policies.clientProfileId,
        assignedAgentId: policies.assignedAgentId,
        agentCode: agentProfiles.agentCode,
        agentFirstName: userAccounts.firstName,
        agentLastName: userAccounts.lastName,
        branchCode: policies.branchCode,
        policyNumber: policies.policyNumber,
        policyOwnerName: policies.policyOwnerName,
        lifeInsuredName: policies.lifeInsuredName,
        planCode: policies.planCode,
        planName: policies.planName,
        currency: policies.currency,
        firstIssueDate: policies.firstIssueDate,
        mode: policies.mode,
        modalPremium: sql<string>`${policies.modalPremium}::text`,
        sumAssured: sql<string>`${policies.sumAssured}::text`,
        api: sql<string>`${policies.api}::text`,
        policyStatus: policies.policyStatus,
        notes: policies.notes,
        createdAtUtc: policies.createdAtUtc,
        updatedAtUtc: policies.updatedAtUtc,
      })
      .from(policies)
      .leftJoin(agentProfiles, eq(policies.assignedAgentId, agentProfiles.id))
      .leftJoin(userAccounts, eq(agentProfiles.userId, userAccounts.id))
      .where(eq(policies.id, policyId))
      .limit(1);

    if (!row) {
      throw new NotFoundError('Policy not found.');
    }

    const [statusRows, auditRows] = await Promise.all([
      db
        .select({
          id: policyStatusHistory.id,
          previousStatus: policyStatusHistory.previousStatus,
          nextStatus: policyStatusHistory.nextStatus,
          effectiveAtUtc: policyStatusHistory.effectiveAtUtc,
          reason: policyStatusHistory.reason,
          notes: policyStatusHistory.notes,
          metadata: policyStatusHistory.metadata,
          actorFirstName: userAccounts.firstName,
          actorLastName: userAccounts.lastName,
        })
        .from(policyStatusHistory)
        .leftJoin(userAccounts, eq(policyStatusHistory.changedByUserId, userAccounts.id))
        .where(eq(policyStatusHistory.policyId, policyId))
        .orderBy(desc(policyStatusHistory.effectiveAtUtc), desc(policyStatusHistory.createdAtUtc)),
      db
        .select({
          id: systemAuditLogs.id,
          action: systemAuditLogs.action,
          createdAtUtc: systemAuditLogs.createdAt,
          oldValue: systemAuditLogs.oldValue,
          newValue: systemAuditLogs.newValue,
          actorFirstName: userAccounts.firstName,
          actorLastName: userAccounts.lastName,
        })
        .from(systemAuditLogs)
        .leftJoin(userAccounts, eq(systemAuditLogs.actorUserId, userAccounts.id))
        .where(and(eq(systemAuditLogs.entityName, 'Policy'), eq(systemAuditLogs.entityId, policyId)))
        .orderBy(desc(systemAuditLogs.createdAt)),
    ]);

    return {
      ...formatPolicyListRow(row, this.getValidationIssues(row)),
      timeline: {
        statusHistory: statusRows.map((item) => ({
          id: item.id,
          previousStatus: item.previousStatus,
          nextStatus: item.nextStatus,
          effectiveAtUtc: item.effectiveAtUtc.toISOString(),
          reason: item.reason ?? null,
          notes: item.notes ?? null,
          changedByName: fullName(item.actorFirstName, item.actorLastName),
          metadata: item.metadata ?? null,
        })),
        auditEvents: auditRows.map((item) => ({
          id: item.id,
          action: item.action,
          timestampUtc: item.createdAtUtc.toISOString(),
          actorName: fullName(item.actorFirstName, item.actorLastName),
          oldValue: (item.oldValue as Record<string, unknown> | null) ?? null,
          newValue: (item.newValue as Record<string, unknown> | null) ?? null,
        })),
      },
    };
  }

  async createPolicy(input: ManualPolicyInput, actor: AuthTokenPayload): Promise<PolicyDetailResponse> {
    if (actor.role !== 'Admin') {
      throw new ForbiddenError('Admin access required.');
    }

    const normalizedPlanCode = input.planCode?.toUpperCase();
    await this.assertUniquePolicyNumber(input.policyNumber);
    const [agent, plan] = await Promise.all([
      this.validateAgent(input.assignedAgentId),
      this.validatePlanCode(normalizedPlanCode),
    ]);

    const createdPolicyId = await withDbTransaction('policy.create', async (tx) => {
      const [created] = await tx
        .insert(policies)
        .values({
          clientProfileId: input.clientProfileId ?? null,
          assignedAgentId: input.assignedAgentId ?? null,
          policyNumber: input.policyNumber,
          branchCode: input.branchCode || agent?.branchCode || 'UNASSIGNED',
          policyOwnerName: input.policyOwnerName ?? null,
          lifeInsuredName: input.lifeInsuredName ?? null,
          planCode: normalizedPlanCode ?? null,
          planName: input.planName ?? plan?.planName ?? null,
          currency: input.currency,
          firstIssueDate: input.firstIssueDate ?? null,
          mode: input.mode ?? null,
          modalPremium: String(input.modalPremium),
          sumAssured: String(input.sumAssured),
          api: String(input.api),
          policyStatus: input.policyStatus,
          notes: input.notes ?? null,
          createdByUserId: actor.sub,
          updatedByUserId: actor.sub,
        })
        .returning({ id: policies.id });

      await tx.insert(policyStatusHistory).values({
        policyId: created.id,
        changedByUserId: actor.sub,
        previousStatus: null,
        nextStatus: input.policyStatus,
        effectiveAtUtc: new Date(),
        reason: 'Policy created',
        notes: input.notes ?? null,
        metadata: {
          source: 'manual-policy-management',
        },
      });

      await logSystemAudit(
        {
          action: 'policy.create',
          userId: actor.sub,
          entityName: 'Policy',
          resourceId: created.id,
          newValue: {
            policyNumber: input.policyNumber,
            assignedAgentId: input.assignedAgentId ?? null,
            planCode: normalizedPlanCode ?? null,
            branchCode: input.branchCode || agent?.branchCode || 'UNASSIGNED',
            policyStatus: input.policyStatus,
          },
        },
        tx,
      );

      return created.id;
    });

    return this.getPolicyDetail(createdPolicyId, actor);
  }

  async updatePolicy(
    policyId: string,
    input: UpdateManualPolicy,
    actor: AuthTokenPayload,
  ): Promise<PolicyDetailResponse> {
    if (actor.role !== 'Admin') {
      throw new ForbiddenError('Admin access required.');
    }

    const [existing] = await db.select().from(policies).where(eq(policies.id, policyId)).limit(1);

    if (!existing) {
      throw new NotFoundError('Policy not found.');
    }

    const nextPolicyNumber = input.policyNumber ?? existing.policyNumber;
    const nextAgentId = input.assignedAgentId ?? existing.assignedAgentId ?? undefined;
    const nextPlanCode = input.planCode !== undefined ? input.planCode?.toUpperCase() : existing.planCode ?? undefined;
    const nextStatus = input.policyStatus ?? existing.policyStatus;

    if (nextPolicyNumber !== existing.policyNumber) {
      await this.assertUniquePolicyNumber(nextPolicyNumber, policyId);
    }

    const [agent, plan] = await Promise.all([
      this.validateAgent(nextAgentId),
      this.validatePlanCode(nextPlanCode),
    ]);

    await withDbTransaction('policy.update', async (tx) => {
      await tx
        .update(policies)
        .set({
          ...(input.clientProfileId !== undefined && { clientProfileId: input.clientProfileId }),
          ...(input.assignedAgentId !== undefined && { assignedAgentId: input.assignedAgentId ?? null }),
          ...(input.policyNumber !== undefined && { policyNumber: nextPolicyNumber }),
          ...(input.branchCode !== undefined && { branchCode: input.branchCode }),
          ...(input.policyOwnerName !== undefined && { policyOwnerName: input.policyOwnerName ?? null }),
          ...(input.lifeInsuredName !== undefined && { lifeInsuredName: input.lifeInsuredName ?? null }),
          ...(input.planCode !== undefined && { planCode: nextPlanCode ?? null }),
          ...(input.planName !== undefined
            ? { planName: input.planName ?? null }
            : input.planCode !== undefined
              ? { planName: plan?.planName ?? null }
              : {}),
          ...(input.currency !== undefined && { currency: input.currency }),
          ...(input.firstIssueDate !== undefined && { firstIssueDate: input.firstIssueDate ?? null }),
          ...(input.mode !== undefined && { mode: input.mode ?? null }),
          ...(input.modalPremium !== undefined && { modalPremium: String(input.modalPremium) }),
          ...(input.sumAssured !== undefined && { sumAssured: String(input.sumAssured) }),
          ...(input.api !== undefined && { api: String(input.api) }),
          ...(input.policyStatus !== undefined && { policyStatus: nextStatus }),
          ...('notes' in input && { notes: input.notes ?? null }),
          updatedByUserId: actor.sub,
          updatedAtUtc: new Date(),
        })
        .where(eq(policies.id, policyId));

      if (nextStatus !== existing.policyStatus) {
        await tx.insert(policyStatusHistory).values({
          policyId,
          changedByUserId: actor.sub,
          previousStatus: existing.policyStatus,
          nextStatus,
          effectiveAtUtc: new Date(),
          reason: 'Policy status updated',
          notes: input.notes ?? existing.notes ?? null,
          metadata: {
            source: 'manual-policy-management',
          },
        });
      }

      await logSystemAudit(
        {
          action: nextStatus !== existing.policyStatus ? 'policy.status-change' : 'policy.update',
          userId: actor.sub,
          entityName: 'Policy',
          resourceId: policyId,
          oldValue: {
            policyNumber: existing.policyNumber,
            assignedAgentId: existing.assignedAgentId,
            planCode: existing.planCode,
            policyStatus: existing.policyStatus,
            branchCode: existing.branchCode,
          },
          newValue: {
            policyNumber: nextPolicyNumber,
            assignedAgentId: nextAgentId ?? null,
            planCode: nextPlanCode ?? null,
            planName: input.planName ?? plan?.planName ?? existing.planName ?? null,
            branchCode: input.branchCode ?? agent?.branchCode ?? existing.branchCode,
            policyStatus: nextStatus,
          },
        },
        tx,
      );
    });

    return this.getPolicyDetail(policyId, actor);
  }
}

export const policiesService = new PoliciesService();
