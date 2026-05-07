import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import type {
  ListManualPersistencyQuery,
  ManualPersistencyInput,
  UpdateManualPersistency,
} from '@a1prime/schemas';

import { db, withDbTransaction } from '@/db/client';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { agentProfiles, perPerformance } from '@/schema';
import { logSystemAudit } from '@/shared/lib/audit';
import type { AuthTokenPayload } from '@/shared/lib/auth';

export const LOW_PERSISTENCY_THRESHOLD = 85;

export interface PersistencyRecord {
  id: string;
  agentId: string;
  agentName: string;
  agentCode: string;
  recordMonth: string;
  branchCode: string | null;
  agentType: string | null;
  team: string | null;
  personalPersistency: number;
  unitPersistency: number;
  branchPersistency: number;
  isLowPersistency: boolean;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function toRecord(row: {
  id: string;
  agentId: string;
  agentName: string;
  agentCode: string;
  recordMonth: string;
  branchCode: string | null;
  agentType: string | null;
  team: string | null;
  personalPersistency: string;
  unitPersistency: string;
  branchPersistency: string;
  notes: string | null;
  createdAtUtc: Date;
  updatedAtUtc: Date;
}): PersistencyRecord {
  const personalPersistency = toNumber(row.personalPersistency);

  return {
    ...row,
    personalPersistency,
    unitPersistency: toNumber(row.unitPersistency),
    branchPersistency: toNumber(row.branchPersistency),
    isLowPersistency: personalPersistency < LOW_PERSISTENCY_THRESHOLD,
    createdAtUtc: row.createdAtUtc.toISOString(),
    updatedAtUtc: row.updatedAtUtc.toISOString(),
  };
}

export class PersistencyService {
  private async getActorBranchCode(actor: AuthTokenPayload): Promise<string | null> {
    if (!actor.agentId) {
      return null;
    }

    const [profile] = await db
      .select({ branchCode: agentProfiles.branchCode })
      .from(agentProfiles)
      .where(and(eq(agentProfiles.id, actor.agentId), isNull(agentProfiles.deletedAtUtc)))
      .limit(1);

    return profile?.branchCode ?? null;
  }

  private async getScopedAgentIds(actor: AuthTokenPayload): Promise<string[] | null> {
    if (actor.role === 'Admin') {
      return null;
    }

    if (actor.role === 'Agent') {
      return actor.agentId ? [actor.agentId] : [];
    }

    const branchCode = await this.getActorBranchCode(actor);
    if (!branchCode) {
      throw new ForbiddenError('Branch Manager persistency access requires a linked branch profile.');
    }

    const rows = await db
      .select({ id: agentProfiles.id })
      .from(agentProfiles)
      .where(and(eq(agentProfiles.branchCode, branchCode), isNull(agentProfiles.deletedAtUtc)));

    return rows.map((row) => row.id);
  }

  async listPersistencyRecords(
    query: ListManualPersistencyQuery,
    actor: AuthTokenPayload,
  ): Promise<{ data: PersistencyRecord[]; meta: { total: number; page: number; pageSize: number } }> {
    const scopedAgentIds = await this.getScopedAgentIds(actor);
    const conditions = [];

    if (scopedAgentIds) {
      if (scopedAgentIds.length === 0) {
        return { data: [], meta: { total: 0, page: query.page, pageSize: query.pageSize } };
      }
      conditions.push(inArray(perPerformance.agentId, scopedAgentIds));
    }

    if (query.recordMonth) conditions.push(eq(perPerformance.recordMonth, query.recordMonth));
    if (query.fromMonth) conditions.push(gte(perPerformance.recordMonth, query.fromMonth));
    if (query.toMonth) conditions.push(lte(perPerformance.recordMonth, query.toMonth));
    if (query.agentId) conditions.push(eq(perPerformance.agentId, query.agentId));
    if (query.branchCode) conditions.push(eq(perPerformance.branchCode, query.branchCode));
    if (query.team) conditions.push(eq(perPerformance.team, query.team));
    if (query.agentType) conditions.push(eq(perPerformance.agentType, query.agentType));
    if (query.lowOnly) {
      conditions.push(sql`${perPerformance.personalPersistency} < ${LOW_PERSISTENCY_THRESHOLD}`);
    }
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          ilike(agentProfiles.displayName, term),
          ilike(agentProfiles.agentCode, term),
          ilike(perPerformance.branchCode, term),
          ilike(perPerformance.team, term),
        )!,
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;
    const offset = (query.page - 1) * query.pageSize;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: perPerformance.id,
          agentId: perPerformance.agentId,
          agentName: agentProfiles.displayName,
          agentCode: agentProfiles.agentCode,
          recordMonth: perPerformance.recordMonth,
          branchCode: perPerformance.branchCode,
          agentType: perPerformance.agentType,
          team: perPerformance.team,
          personalPersistency: perPerformance.personalPersistency,
          unitPersistency: perPerformance.unitPersistency,
          branchPersistency: perPerformance.branchPersistency,
          notes: perPerformance.notes,
          createdAtUtc: perPerformance.createdAtUtc,
          updatedAtUtc: perPerformance.updatedAtUtc,
        })
        .from(perPerformance)
        .innerJoin(agentProfiles, eq(agentProfiles.id, perPerformance.agentId))
        .where(whereClause)
        .orderBy(desc(perPerformance.recordMonth), asc(agentProfiles.displayName))
        .limit(query.pageSize)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(perPerformance)
        .innerJoin(agentProfiles, eq(agentProfiles.id, perPerformance.agentId))
        .where(whereClause),
    ]);

    return {
      data: rows.map(toRecord),
      meta: {
        total: totalRows[0]?.total ?? 0,
        page: query.page,
        pageSize: query.pageSize,
      },
    };
  }

  async getPersistencyRecord(id: string, actor: AuthTokenPayload): Promise<PersistencyRecord> {
    const scopedAgentIds = await this.getScopedAgentIds(actor);
    const conditions = [eq(perPerformance.id, id)];

    if (scopedAgentIds) {
      if (scopedAgentIds.length === 0) throw new NotFoundError('Persistency record not found.');
      conditions.push(inArray(perPerformance.agentId, scopedAgentIds));
    }

    const [row] = await db
      .select({
        id: perPerformance.id,
        agentId: perPerformance.agentId,
        agentName: agentProfiles.displayName,
        agentCode: agentProfiles.agentCode,
        recordMonth: perPerformance.recordMonth,
        branchCode: perPerformance.branchCode,
        agentType: perPerformance.agentType,
        team: perPerformance.team,
        personalPersistency: perPerformance.personalPersistency,
        unitPersistency: perPerformance.unitPersistency,
        branchPersistency: perPerformance.branchPersistency,
        notes: perPerformance.notes,
        createdAtUtc: perPerformance.createdAtUtc,
        updatedAtUtc: perPerformance.updatedAtUtc,
      })
      .from(perPerformance)
      .innerJoin(agentProfiles, eq(agentProfiles.id, perPerformance.agentId))
      .where(and(...conditions))
      .limit(1);

    if (!row) {
      throw new NotFoundError('Persistency record not found.');
    }

    return toRecord(row);
  }

  async createPersistencyRecord(
    input: ManualPersistencyInput,
    actor: AuthTokenPayload,
  ): Promise<PersistencyRecord> {
    if (actor.role !== 'Admin') throw new ForbiddenError('Admin access required.');

    const agent = await this.requireAgent(input.agentId);
    const [existing] = await db
      .select({ id: perPerformance.id })
      .from(perPerformance)
      .where(and(eq(perPerformance.agentId, input.agentId), eq(perPerformance.recordMonth, input.recordMonth)))
      .limit(1);

    if (existing) {
      throw new BadRequestError('Persistency record already exists for this agent and month.');
    }

    const [created] = await withDbTransaction('persistency.create', async (tx) => {
      const [row] = await tx
        .insert(perPerformance)
        .values({
          agentId: input.agentId,
          recordMonth: input.recordMonth,
          branchCode: input.branchCode ?? agent.branchCode,
          agentType: input.agentType ?? null,
          team: input.team ?? null,
          personalPersistency: input.personalPersistency.toFixed(2),
          unitPersistency: input.unitPersistency.toFixed(2),
          branchPersistency: input.branchPersistency.toFixed(2),
          notes: input.notes ?? null,
          createdByUserId: actor.sub,
          updatedByUserId: actor.sub,
        })
        .returning({ id: perPerformance.id });

      await logSystemAudit(
        {
          action: 'persistency.create',
          userId: actor.sub,
          entityName: 'Persistency',
          resourceId: row.id,
          newValue: input as Record<string, unknown>,
        },
        tx,
      );

      return [row];
    });

    return this.getPersistencyRecord(created.id, actor);
  }

  async updatePersistencyRecord(
    id: string,
    input: UpdateManualPersistency,
    actor: AuthTokenPayload,
  ): Promise<PersistencyRecord> {
    if (actor.role !== 'Admin') throw new ForbiddenError('Admin access required.');

    const [existing] = await db.select().from(perPerformance).where(eq(perPerformance.id, id)).limit(1);
    if (!existing) throw new NotFoundError('Persistency record not found.');

    const nextAgentId = input.agentId ?? existing.agentId;
    const nextRecordMonth = input.recordMonth ?? existing.recordMonth;
    await this.requireAgent(nextAgentId);

    if (nextAgentId !== existing.agentId || nextRecordMonth !== existing.recordMonth) {
      const [duplicate] = await db
        .select({ id: perPerformance.id })
        .from(perPerformance)
        .where(and(eq(perPerformance.agentId, nextAgentId), eq(perPerformance.recordMonth, nextRecordMonth)))
        .limit(1);
      if (duplicate) {
        throw new BadRequestError('Persistency record already exists for this agent and month.');
      }
    }

    await withDbTransaction('persistency.update', async (tx) => {
      await tx
        .update(perPerformance)
        .set({
          ...(input.agentId !== undefined && { agentId: input.agentId }),
          ...(input.recordMonth !== undefined && { recordMonth: input.recordMonth }),
          ...(input.branchCode !== undefined && { branchCode: input.branchCode }),
          ...(input.agentType !== undefined && { agentType: input.agentType }),
          ...(input.team !== undefined && { team: input.team }),
          ...(input.personalPersistency !== undefined && {
            personalPersistency: input.personalPersistency.toFixed(2),
          }),
          ...(input.unitPersistency !== undefined && { unitPersistency: input.unitPersistency.toFixed(2) }),
          ...(input.branchPersistency !== undefined && {
            branchPersistency: input.branchPersistency.toFixed(2),
          }),
          ...('notes' in input && { notes: input.notes ?? null }),
          updatedByUserId: actor.sub,
          updatedAtUtc: new Date(),
        })
        .where(eq(perPerformance.id, id));

      await logSystemAudit(
        {
          action: 'persistency.update',
          userId: actor.sub,
          entityName: 'Persistency',
          resourceId: id,
          oldValue: {
            agentId: existing.agentId,
            recordMonth: existing.recordMonth,
            personalPersistency: existing.personalPersistency,
          },
          newValue: input as Record<string, unknown>,
        },
        tx,
      );
    });

    return this.getPersistencyRecord(id, actor);
  }

  private async requireAgent(agentId: string) {
    const [agent] = await db
      .select({ id: agentProfiles.id, branchCode: agentProfiles.branchCode })
      .from(agentProfiles)
      .where(and(eq(agentProfiles.id, agentId), isNull(agentProfiles.deletedAtUtc)))
      .limit(1);

    if (!agent) {
      throw new NotFoundError('Agent not found.');
    }

    return agent;
  }
}

export const persistencyService = new PersistencyService();
