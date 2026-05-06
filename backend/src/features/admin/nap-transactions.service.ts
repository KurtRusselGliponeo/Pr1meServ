import { and, desc, eq, gte, ilike, lte, ne, or, sql } from 'drizzle-orm';
import type {
  ListManualNapTransactionsQuery,
  ManualNapTransactionInput,
  NapTransactionType,
  UpdateManualNapTransaction,
} from '@a1prime/schemas';

import { db, withDbTransaction } from '@/db/client';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors';
import {
  agentProfiles,
  napTransactions,
  policies,
  policyStatusHistory,
  policyTransactions,
  systemAuditLogs,
  userAccounts,
} from '@/schema';
import { logSystemAudit } from '@/shared/lib/audit';
import type { AuthTokenPayload } from '@/shared/lib/auth';
import { metricsService } from '@/features/phase-5-performance/metrics/metrics.service';
import type { DbTransaction } from '@/db/client';

type NapTransactionListItem = {
  id: string;
  policyId: string | null;
  policyNumber: string;
  accountType: string | null;
  contractTypeCode: string | null;
  typeDesc: string | null;
  transactionDate: string;
  tempReceiptDate: string | null;
  agentId: string;
  agentCode: string | null;
  agentName: string | null;
  branchCode: string | null;
  api: string;
  ccCredit: number | null;
  transactionType: string;
  creditStatus: string | null;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

type NapTransactionDetail = NapTransactionListItem & {
  history: {
    auditEvents: Array<{
      id: string;
      action: string;
      timestampUtc: string;
      actorName: string | null;
    }>;
    policyEffects: Array<{
      id: string;
      effectType: string;
      effectiveAtUtc: string | null;
      status: string | null;
    }>;
  };
};

type ListResponse = {
  data: NapTransactionListItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function fullName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || null;
}

function mapRow(row: {
  id: string;
  policyId: string | null;
  policyNumber: string;
  accountType: string | null;
  contractTypeCode: string | null;
  typeDesc: string | null;
  transactionDate: Date;
  tempReceiptDate: Date | null;
  agentId: string;
  agentCode: string | null;
  agentFirstName: string | null;
  agentLastName: string | null;
  branchCode: string | null;
  api: string | null;
  ccCredit: number | null;
  transactionType: string;
  creditStatus: string | null;
  notes: string | null;
  createdAtUtc: Date;
  updatedAtUtc: Date;
}): NapTransactionListItem {
  return {
    id: row.id,
    policyId: row.policyId,
    policyNumber: row.policyNumber,
    accountType: row.accountType,
    contractTypeCode: row.contractTypeCode,
    typeDesc: row.typeDesc,
    transactionDate: row.transactionDate.toISOString(),
    tempReceiptDate: toIso(row.tempReceiptDate),
    agentId: row.agentId,
    agentCode: row.agentCode,
    agentName: fullName(row.agentFirstName, row.agentLastName),
    branchCode: row.branchCode,
    api: row.api ?? '0.0000',
    ccCredit: row.ccCredit,
    transactionType: row.transactionType,
    creditStatus: row.creditStatus,
    notes: row.notes,
    createdAtUtc: row.createdAtUtc.toISOString(),
    updatedAtUtc: row.updatedAtUtc.toISOString(),
  };
}

type ResolvedPolicy = {
  id: string;
  policyNumber: string;
  assignedAgentId: string | null;
  branchCode: string;
  policyStatus: string;
};

type ResolvedAgent = {
  id: string;
  branchCode: string;
};

export class AdminNapTransactionsService {
  private assertAdmin(actor: AuthTokenPayload) {
    if (actor.role !== 'Admin') {
      throw new ForbiddenError('Admin access required.');
    }
  }

  private async resolvePolicy(input: { policyId?: string; policyNumber: string }): Promise<ResolvedPolicy> {
    const conditions = input.policyId
      ? [eq(policies.id, input.policyId)]
      : [eq(policies.policyNumber, input.policyNumber)];

    const [policy] = await db
      .select({
        id: policies.id,
        policyNumber: policies.policyNumber,
        assignedAgentId: policies.assignedAgentId,
        branchCode: policies.branchCode,
        policyStatus: policies.policyStatus,
      })
      .from(policies)
      .where(and(...conditions))
      .limit(1);

    if (!policy) {
      throw new BadRequestError('Policy must exist.');
    }

    if (input.policyId && policy.policyNumber !== input.policyNumber) {
      throw new BadRequestError('Policy number does not match the selected policy.');
    }

    return policy;
  }

  private async resolveAgent(agentId: string | undefined, policy: ResolvedPolicy): Promise<ResolvedAgent> {
    const resolvedAgentId = agentId ?? policy.assignedAgentId ?? undefined;

    if (!resolvedAgentId) {
      throw new BadRequestError('Agent could not be resolved from the policy. Please select an agent.');
    }

    const [agent] = await db
      .select({
        id: agentProfiles.id,
        branchCode: agentProfiles.branchCode,
      })
      .from(agentProfiles)
      .where(and(eq(agentProfiles.id, resolvedAgentId), eq(agentProfiles.status, 'Active')))
      .limit(1);

    if (!agent) {
      throw new BadRequestError('Assigned agent does not exist.');
    }

    return agent;
  }

  private async assertNoDuplicate(
    input: { policyNumber: string; transactionType: string; transactionDate: Date; api: string },
    excludeId?: string,
  ) {
    const conditions = [
      eq(napTransactions.policyNumber, input.policyNumber),
      eq(napTransactions.transactionType, input.transactionType),
      eq(napTransactions.transactionDate, input.transactionDate),
      eq(napTransactions.api, input.api),
    ];

    if (excludeId) {
      conditions.push(ne(napTransactions.id, excludeId));
    }

    const [existing] = await db
      .select({ id: napTransactions.id })
      .from(napTransactions)
      .where(and(...conditions))
      .limit(1);

    if (existing) {
      throw new BadRequestError('Duplicate NAP transaction detected for the same policy, type, date, and API.');
    }
  }

  private async assertReinstatementAllowed(policyId: string, transactionType: NapTransactionType) {
    if (transactionType !== 'Reinstated') {
      return;
    }

    const [existingLapse] = await db
      .select({ id: policyStatusHistory.id })
      .from(policyStatusHistory)
      .where(and(eq(policyStatusHistory.policyId, policyId), eq(policyStatusHistory.nextStatus, 'Lapsed')))
      .limit(1);

    if (!existingLapse) {
      throw new BadRequestError('Reinstatement is only allowed after a policy has been marked as lapsed.');
    }
  }

  private getEffectStatus(transactionType: NapTransactionType): string | null {
    switch (transactionType) {
      case 'Issued':
        return 'Active';
      case 'Lapsed':
        return 'Lapsed';
      case 'Reinstated':
        return 'Reinstated';
      case 'Cancelled':
        return 'Cancelled';
      default:
        return null;
    }
  }

  private getPolicyTransactionType(transactionType: NapTransactionType) {
    switch (transactionType) {
      case 'Issued':
        return 'ISSUED';
      case 'Lapsed':
        return 'LAPSED';
      case 'Reinstated':
        return 'REINSTATED';
      case 'Cooling Off':
        return 'COOLING_OFF';
      case 'Increase/Decrease':
        return 'INCREASE_DECREASE';
      case 'Cancelled':
        return 'CANCELLED';
      default:
        return 'OTHER';
    }
  }

  private async applyPolicyEffects(
    tx: DbTransaction,
    input: {
      transactionId: string;
      transactionType: NapTransactionType;
      transactionDate: Date;
      creditStatus?: string;
      notes?: string | null;
      api: string;
      policy: ResolvedPolicy;
      actor: AuthTokenPayload;
      replaceExistingEffects?: boolean;
    },
  ) {
    if (input.replaceExistingEffects) {
      await tx.delete(policyTransactions).where(eq(policyTransactions.sourceRecordId, input.transactionId));
    }

    const nextStatus = this.getEffectStatus(input.transactionType);

    if (nextStatus) {
      await tx
        .update(policies)
        .set({
          policyStatus: nextStatus as never,
          updatedByUserId: input.actor.sub,
          updatedAtUtc: new Date(),
        })
        .where(eq(policies.id, input.policy.id));

      await tx.insert(policyStatusHistory).values({
        policyId: input.policy.id,
        changedByUserId: input.actor.sub,
        previousStatus: input.policy.policyStatus as never,
        nextStatus: nextStatus as never,
        effectiveAtUtc: input.transactionDate,
        reason: `Manual NAP transaction: ${input.transactionType}`,
        notes: input.notes ?? null,
        metadata: {
          source: 'manual-nap-transaction',
          sourceRecordId: input.transactionId,
          api: input.api,
        },
      });
    }

    await tx.insert(policyTransactions).values({
      policyId: input.policy.id,
      sourceType: 'NAP',
      sourceRecordId: input.transactionId,
      transactionType: this.getPolicyTransactionType(input.transactionType),
      transactionStatus: input.creditStatus ?? 'MANUAL',
      effectiveAtUtc: input.transactionDate,
      payload: JSON.stringify({
        source: 'manual-nap-transaction',
        transactionType: input.transactionType,
        api: input.api,
      }),
    });

    await logSystemAudit(
      {
        action: 'policy.effect.nap-transaction',
        userId: input.actor.sub,
        entityName: 'Policy',
        resourceId: input.policy.id,
        oldValue: {
          policyStatus: input.policy.policyStatus,
        },
        newValue: {
          policyStatus: nextStatus ?? input.policy.policyStatus,
          transactionType: input.transactionType,
          sourceRecordId: input.transactionId,
        },
      },
      tx,
    );
  }

  async listTransactions(query: ListManualNapTransactionsQuery, actor: AuthTokenPayload): Promise<ListResponse> {
    this.assertAdmin(actor);

    const page = query.page;
    const pageSize = query.pageSize;
    const offset = (page - 1) * pageSize;
    const conditions = [];

    if (query.agentId) {
      conditions.push(eq(napTransactions.agentId, query.agentId));
    }

    if (query.branchCode) {
      conditions.push(eq(napTransactions.branchCode, query.branchCode));
    }

    if (query.transactionType) {
      conditions.push(eq(napTransactions.transactionType, query.transactionType));
    }

    if (query.creditStatus) {
      conditions.push(eq(napTransactions.creditStatus, query.creditStatus));
    }

    if (query.dateFrom) {
      conditions.push(gte(napTransactions.transactionDate, new Date(`${query.dateFrom}T00:00:00.000Z`)));
    }

    if (query.dateTo) {
      conditions.push(lte(napTransactions.transactionDate, new Date(`${query.dateTo}T23:59:59.999Z`)));
    }

    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          ilike(napTransactions.policyNumber, term),
          ilike(napTransactions.accountType, term),
          ilike(napTransactions.typeDesc, term),
          ilike(agentProfiles.agentCode, term),
          ilike(userAccounts.firstName, term),
          ilike(userAccounts.lastName, term),
        )!,
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: napTransactions.id,
          policyId: napTransactions.policyId,
          policyNumber: napTransactions.policyNumber,
          accountType: napTransactions.accountType,
          contractTypeCode: napTransactions.contractTypeCode,
          typeDesc: napTransactions.typeDesc,
          transactionDate: napTransactions.transactionDate,
          tempReceiptDate: napTransactions.tempReceiptDate,
          agentId: napTransactions.agentId,
          agentCode: agentProfiles.agentCode,
          agentFirstName: userAccounts.firstName,
          agentLastName: userAccounts.lastName,
          branchCode: napTransactions.branchCode,
          api: napTransactions.api,
          ccCredit: napTransactions.ccCredit,
          transactionType: napTransactions.transactionType,
          creditStatus: napTransactions.creditStatus,
          notes: napTransactions.notes,
          createdAtUtc: napTransactions.createdAtUtc,
          updatedAtUtc: napTransactions.updatedAtUtc,
        })
        .from(napTransactions)
        .leftJoin(agentProfiles, eq(napTransactions.agentId, agentProfiles.id))
        .leftJoin(userAccounts, eq(agentProfiles.userId, userAccounts.id))
        .where(whereClause)
        .orderBy(desc(napTransactions.transactionDate), desc(napTransactions.createdAtUtc))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(napTransactions)
        .leftJoin(agentProfiles, eq(napTransactions.agentId, agentProfiles.id))
        .leftJoin(userAccounts, eq(agentProfiles.userId, userAccounts.id))
        .where(whereClause),
    ]);

    const total = totalRows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      data: rows.map(mapRow),
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

  async getTransactionDetail(id: string, actor: AuthTokenPayload): Promise<NapTransactionDetail> {
    this.assertAdmin(actor);

    const [row] = await db
      .select({
        id: napTransactions.id,
        policyId: napTransactions.policyId,
        policyNumber: napTransactions.policyNumber,
        accountType: napTransactions.accountType,
        contractTypeCode: napTransactions.contractTypeCode,
        typeDesc: napTransactions.typeDesc,
        transactionDate: napTransactions.transactionDate,
        tempReceiptDate: napTransactions.tempReceiptDate,
        agentId: napTransactions.agentId,
        agentCode: agentProfiles.agentCode,
        agentFirstName: userAccounts.firstName,
        agentLastName: userAccounts.lastName,
        branchCode: napTransactions.branchCode,
        api: napTransactions.api,
        ccCredit: napTransactions.ccCredit,
        transactionType: napTransactions.transactionType,
        creditStatus: napTransactions.creditStatus,
        notes: napTransactions.notes,
        createdAtUtc: napTransactions.createdAtUtc,
        updatedAtUtc: napTransactions.updatedAtUtc,
      })
      .from(napTransactions)
      .leftJoin(agentProfiles, eq(napTransactions.agentId, agentProfiles.id))
      .leftJoin(userAccounts, eq(agentProfiles.userId, userAccounts.id))
      .where(eq(napTransactions.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundError('NAP transaction not found.');
    }

    const [auditRows, effectRows] = await Promise.all([
      db
        .select({
          id: systemAuditLogs.id,
          action: systemAuditLogs.action,
          createdAtUtc: systemAuditLogs.createdAt,
          actorFirstName: userAccounts.firstName,
          actorLastName: userAccounts.lastName,
        })
        .from(systemAuditLogs)
        .leftJoin(userAccounts, eq(systemAuditLogs.actorUserId, userAccounts.id))
        .where(
          and(
            eq(systemAuditLogs.entityName, 'NapTransaction'),
            eq(systemAuditLogs.entityId, id),
          ),
        )
        .orderBy(desc(systemAuditLogs.createdAt)),
      db
        .select({
          id: policyTransactions.id,
          effectType: policyTransactions.transactionType,
          effectiveAtUtc: policyTransactions.effectiveAtUtc,
          status: policyTransactions.transactionStatus,
        })
        .from(policyTransactions)
        .where(eq(policyTransactions.sourceRecordId, id))
        .orderBy(desc(policyTransactions.createdAtUtc)),
    ]);

    return {
      ...mapRow(row),
      history: {
        auditEvents: auditRows.map((item) => ({
          id: item.id,
          action: item.action,
          timestampUtc: item.createdAtUtc.toISOString(),
          actorName: fullName(item.actorFirstName, item.actorLastName),
        })),
        policyEffects: effectRows.map((item) => ({
          id: item.id,
          effectType: item.effectType,
          effectiveAtUtc: toIso(item.effectiveAtUtc),
          status: item.status ?? null,
        })),
      },
    };
  }

  async createTransaction(input: ManualNapTransactionInput, actor: AuthTokenPayload): Promise<NapTransactionDetail> {
    this.assertAdmin(actor);

    const transactionDate = new Date(input.transactionDate);
    const api = Number(input.api).toFixed(4);
    const policy = await this.resolvePolicy({ policyId: input.policyId, policyNumber: input.policyNumber });
    const agent = await this.resolveAgent(input.agentId, policy);

    await this.assertNoDuplicate({
      policyNumber: policy.policyNumber,
      transactionType: input.transactionType,
      transactionDate,
      api,
    });
    await this.assertReinstatementAllowed(policy.id, input.transactionType);

    const createdId = await withDbTransaction('nap-transaction.create', async (tx) => {
      const [created] = await tx
        .insert(napTransactions)
        .values({
          policyId: policy.id,
          policyNumber: policy.policyNumber,
          accountType: input.accountType ?? null,
          contractTypeCode: input.contractTypeCode ?? null,
          typeDesc: input.typeDesc ?? null,
          transactionDate,
          tempReceiptDate: input.tempReceiptDate ? new Date(input.tempReceiptDate) : null,
          agentId: agent.id,
          branchCode: input.branchCode ?? policy.branchCode ?? agent.branchCode,
          api,
          ccCredit: input.ccCredit ?? null,
          transactionType: input.transactionType,
          creditStatus: input.creditStatus ?? null,
          notes: input.notes ?? null,
          createdByUserId: actor.sub,
          updatedByUserId: actor.sub,
        })
        .returning({ id: napTransactions.id });

      await this.applyPolicyEffects(tx, {
        transactionId: created.id,
        transactionType: input.transactionType,
        transactionDate,
        creditStatus: input.creditStatus,
        notes: input.notes ?? null,
        api,
        policy,
        actor,
        replaceExistingEffects: false,
      });

      await metricsService.applyManualNapMetricDelta(agent.id, transactionDate, Number(api), tx);

      await logSystemAudit(
        {
          action: 'nap-transaction.create',
          userId: actor.sub,
          entityName: 'NapTransaction',
          resourceId: created.id,
          newValue: {
            policyId: policy.id,
            policyNumber: policy.policyNumber,
            transactionType: input.transactionType,
            api,
            agentId: agent.id,
          },
        },
        tx,
      );

      return created.id;
    });

    return this.getTransactionDetail(createdId, actor);
  }

  async updateTransaction(
    id: string,
    input: UpdateManualNapTransaction,
    actor: AuthTokenPayload,
  ): Promise<NapTransactionDetail> {
    this.assertAdmin(actor);

    const [existing] = await db
      .select()
      .from(napTransactions)
      .where(eq(napTransactions.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('NAP transaction not found.');
    }

    const policy = await this.resolvePolicy({
      policyId: input.policyId ?? existing.policyId ?? undefined,
      policyNumber: input.policyNumber ?? existing.policyNumber,
    });
    const agent = await this.resolveAgent(input.agentId ?? existing.agentId, policy);
    const transactionDate = input.transactionDate ? new Date(input.transactionDate) : existing.transactionDate;
    const transactionType = input.transactionType ?? (existing.transactionType as NapTransactionType);
    const api = input.api !== undefined ? Number(input.api).toFixed(4) : existing.api ?? '0.0000';

    await this.assertNoDuplicate(
      {
        policyNumber: policy.policyNumber,
        transactionType,
        transactionDate,
        api,
      },
      id,
    );
    await this.assertReinstatementAllowed(policy.id, transactionType);

    await withDbTransaction('nap-transaction.update', async (tx) => {
      await tx
        .update(napTransactions)
        .set({
          policyId: policy.id,
          policyNumber: policy.policyNumber,
          accountType: input.accountType ?? existing.accountType,
          contractTypeCode: input.contractTypeCode ?? existing.contractTypeCode,
          typeDesc: input.typeDesc ?? existing.typeDesc,
          transactionDate,
          tempReceiptDate:
            input.tempReceiptDate !== undefined
              ? input.tempReceiptDate
                ? new Date(input.tempReceiptDate)
                : null
              : existing.tempReceiptDate,
          agentId: agent.id,
          branchCode: input.branchCode ?? existing.branchCode ?? policy.branchCode,
          api,
          ccCredit: input.ccCredit ?? existing.ccCredit,
          transactionType,
          creditStatus: input.creditStatus ?? existing.creditStatus,
          notes: 'notes' in input ? input.notes ?? null : existing.notes,
          updatedByUserId: actor.sub,
          updatedAtUtc: new Date(),
        })
        .where(eq(napTransactions.id, id));

      await this.applyPolicyEffects(tx, {
        transactionId: id,
        transactionType,
        transactionDate,
        creditStatus: input.creditStatus ?? existing.creditStatus ?? undefined,
        notes: ('notes' in input ? input.notes : existing.notes) ?? null,
        api,
        policy,
        actor,
        replaceExistingEffects: true,
      });

      const oldApi = Number(existing.api ?? 0);
      const nextApi = Number(api);
      const oldDate = existing.transactionDate;

      if (existing.agentId !== agent.id || oldDate.toISOString().slice(0, 7) !== transactionDate.toISOString().slice(0, 7)) {
        await metricsService.applyManualNapMetricDelta(existing.agentId, oldDate, -oldApi, tx);
        await metricsService.applyManualNapMetricDelta(agent.id, transactionDate, nextApi, tx);
      } else if (oldApi !== nextApi) {
        await metricsService.applyManualNapMetricDelta(agent.id, transactionDate, nextApi - oldApi, tx);
      }

      await logSystemAudit(
        {
          action: 'nap-transaction.update',
          userId: actor.sub,
          entityName: 'NapTransaction',
          resourceId: id,
          oldValue: {
            policyId: existing.policyId,
            policyNumber: existing.policyNumber,
            transactionType: existing.transactionType,
            api: existing.api,
            agentId: existing.agentId,
          },
          newValue: {
            policyId: policy.id,
            policyNumber: policy.policyNumber,
            transactionType,
            api,
            agentId: agent.id,
          },
        },
        tx,
      );
    });

    return this.getTransactionDetail(id, actor);
  }
}

export const adminNapTransactionsService = new AdminNapTransactionsService();
