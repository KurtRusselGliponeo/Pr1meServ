import { and, desc, eq, gte, ilike, lte, ne, or, sql, inArray } from 'drizzle-orm';
import type {
  ListManualRecruitmentsQuery,
  ManualRecruitmentInput,
  RecruitmentStatusAction,
  UpdateManualRecruitment,
} from '@a1prime/schemas';

import { db, withDbTransaction } from '@/db/client';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { agentProfiles, recRecruitment, systemAuditLogs, userAccounts } from '@/schema';
import { logSystemAudit } from '@/shared/lib/audit';
import type { AuthTokenPayload } from '@/shared/lib/auth';
import { metricsService } from '@/features/phase-5-performance/metrics/metrics.service';

interface RecruitmentListItem {
  id: string;
  agentId: string;
  agentCode: string | null;
  agentName: string | null;
  recruiter: string | null;
  umCode: string | null;
  umName: string | null;
  bmCode: string | null;
  bmName: string | null;
  team: string | null;
  birthday: string | null;
  dateAppointed: string;
  dateTerminated: string | null;
  status: string;
  contacts: string | null;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

interface RecruitmentDetailResponse extends RecruitmentListItem {
  timeline: {
    auditEvents: Array<{
      id: string;
      action: string;
      timestampUtc: string;
      actorName: string | null;
    }>;
  };
}

interface RecruitmentListResponse {
  data: RecruitmentListItem[];
  summary: {
    total: number;
    active: number;
    terminated: number;
    reinstated: number;
    pending: number;
  };
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
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

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

function fullName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || null;
}

function toListItem(row: {
  id: string;
  agentId: string;
  agentCode: string | null;
  agentName: string | null;
  recruiter: string | null;
  umCode: string | null;
  umName: string | null;
  bmCode: string | null;
  bmName: string | null;
  team: string | null;
  birthday: Date | string | null;
  dateAppointed: Date;
  dateTerminated: Date | null;
  status: string;
  contacts: string | null;
  notes: string | null;
  createdAtUtc: Date;
  updatedAtUtc: Date;
}): RecruitmentListItem {
  return {
    id: row.id,
    agentId: row.agentId,
    agentCode: row.agentCode,
    agentName: row.agentName,
    recruiter: row.recruiter,
    umCode: row.umCode,
    umName: row.umName,
    bmCode: row.bmCode,
    bmName: row.bmName,
    team: row.team,
    birthday: toDateOnly(row.birthday),
    dateAppointed: row.dateAppointed.toISOString(),
    dateTerminated: toIso(row.dateTerminated),
    status: row.status,
    contacts: row.contacts,
    notes: row.notes,
    createdAtUtc: row.createdAtUtc.toISOString(),
    updatedAtUtc: row.updatedAtUtc.toISOString(),
  };
}

export class AdminRecruitmentService {
  private assertAdmin(actor: AuthTokenPayload) {
    if (actor.role !== 'Admin') {
      throw new ForbiddenError('Admin access required.');
    }
  }

  private async validateAgent(agentId: string) {
    const [agent] = await db
      .select({
        id: agentProfiles.id,
        agentCode: agentProfiles.agentCode,
        displayName: agentProfiles.displayName,
        branchCode: agentProfiles.branchCode,
      })
      .from(agentProfiles)
      .where(eq(agentProfiles.id, agentId))
      .limit(1);

    if (!agent) {
      throw new BadRequestError('Agent could not be resolved.');
    }

    return agent;
  }

  private assertTerminationDate(dateAppointed: Date, dateTerminated: Date | null) {
    if (dateTerminated && dateTerminated < dateAppointed) {
      throw new BadRequestError('Date terminated cannot be before date appointed.');
    }
  }

  private async assertDuplicateActiveAgentCode(agentCode: string | null, excludeId?: string) {
    if (!agentCode) {
      return;
    }

    const conditions = [
      eq(recRecruitment.agentCode, agentCode),
      inArray(recRecruitment.status, ['Active', 'Reinstated']),
    ];

    if (excludeId) {
      conditions.push(ne(recRecruitment.id, excludeId));
    }

    const [existing] = await db
      .select({ id: recRecruitment.id })
      .from(recRecruitment)
      .where(and(...conditions))
      .limit(1);

    if (existing) {
      throw new BadRequestError(`Recruitment record with active agent code ${agentCode} already exists.`);
    }
  }

  async listRecruitments(
    query: ListManualRecruitmentsQuery,
    actor: AuthTokenPayload,
  ): Promise<RecruitmentListResponse> {
    this.assertAdmin(actor);

    const page = query.page;
    const pageSize = query.pageSize;
    const offset = (page - 1) * pageSize;
    const conditions = [];

    if (query.recruiter) {
      conditions.push(eq(recRecruitment.recruiter, query.recruiter));
    }
    if (query.team) {
      conditions.push(eq(recRecruitment.team, query.team));
    }
    if (query.status) {
      conditions.push(eq(recRecruitment.status, query.status));
    }
    if (query.appointedFrom) {
      conditions.push(gte(recRecruitment.dateAppointed, new Date(`${query.appointedFrom}T00:00:00.000Z`)));
    }
    if (query.appointedTo) {
      conditions.push(lte(recRecruitment.dateAppointed, new Date(`${query.appointedTo}T23:59:59.999Z`)));
    }
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          ilike(recRecruitment.agentCode, term),
          ilike(recRecruitment.agentName, term),
          ilike(recRecruitment.recruiter, term),
          ilike(recRecruitment.team, term),
        )!,
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [rows, totalRows, summaryRows] = await Promise.all([
      db
        .select()
        .from(recRecruitment)
        .where(whereClause)
        .orderBy(desc(recRecruitment.dateAppointed), desc(recRecruitment.createdAtUtc))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(recRecruitment)
        .where(whereClause),
      db
        .select({
          active: sql<number>`count(*) filter (where ${recRecruitment.status} = 'Active')::int`,
          terminated: sql<number>`count(*) filter (where ${recRecruitment.status} = 'Terminated')::int`,
          reinstated: sql<number>`count(*) filter (where ${recRecruitment.status} = 'Reinstated')::int`,
          pending: sql<number>`count(*) filter (where ${recRecruitment.status} = 'Pending')::int`,
        })
        .from(recRecruitment)
        .where(whereClause),
    ]);

    const total = totalRows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      data: rows.map(toListItem),
      summary: {
        total,
        active: summaryRows[0]?.active ?? 0,
        terminated: summaryRows[0]?.terminated ?? 0,
        reinstated: summaryRows[0]?.reinstated ?? 0,
        pending: summaryRows[0]?.pending ?? 0,
      },
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

  async getRecruitmentDetail(id: string, actor: AuthTokenPayload): Promise<RecruitmentDetailResponse> {
    this.assertAdmin(actor);

    const [row] = await db.select().from(recRecruitment).where(eq(recRecruitment.id, id)).limit(1);
    if (!row) {
      throw new NotFoundError('Recruitment record not found.');
    }

    const auditRows = await db
      .select({
        id: systemAuditLogs.id,
        action: systemAuditLogs.action,
        createdAtUtc: systemAuditLogs.createdAt,
        actorFirstName: userAccounts.firstName,
        actorLastName: userAccounts.lastName,
      })
      .from(systemAuditLogs)
      .leftJoin(userAccounts, eq(systemAuditLogs.actorUserId, userAccounts.id))
      .where(and(eq(systemAuditLogs.entityName, 'Recruitment'), eq(systemAuditLogs.entityId, id)))
      .orderBy(desc(systemAuditLogs.createdAt));

    return {
      ...toListItem(row),
      timeline: {
        auditEvents: auditRows.map((item) => ({
          id: item.id,
          action: item.action,
          timestampUtc: item.createdAtUtc.toISOString(),
          actorName: fullName(item.actorFirstName, item.actorLastName),
        })),
      },
    };
  }

  async createRecruitment(input: ManualRecruitmentInput, actor: AuthTokenPayload): Promise<RecruitmentDetailResponse> {
    this.assertAdmin(actor);

    const dateAppointed = new Date(input.dateAppointed);
    const dateTerminated = input.dateTerminated ? new Date(input.dateTerminated) : null;
    this.assertTerminationDate(dateAppointed, dateTerminated);

    const agent = await this.validateAgent(input.agentId);
    const agentCode = input.agentCode ?? agent.agentCode;
    const agentName = input.agentName ?? agent.displayName;
    await this.assertDuplicateActiveAgentCode(agentCode, undefined);

    const createdId = await withDbTransaction('recruitment.create', async (tx) => {
      const [created] = await tx
        .insert(recRecruitment)
        .values({
          agentId: agent.id,
          agentCode: agentCode ?? null,
          agentName: agentName ?? null,
          recruiter: input.recruiter ?? null,
          umCode: input.umCode ?? null,
          umName: input.umName ?? null,
          bmCode: input.bmCode ?? null,
          bmName: input.bmName ?? null,
          team: input.team ?? null,
          birthday: input.birthday ?? null,
          dateAppointed,
          dateTerminated,
          status: input.status,
          contacts: input.contacts ?? null,
          notes: input.notes ?? null,
          createdByUserId: actor.sub,
          updatedByUserId: actor.sub,
        })
        .returning({ id: recRecruitment.id });

      await metricsService.applyManualRecruitmentMetricDelta(agent.id, dateAppointed, 1, tx);
      await metricsService.recalculateManualMetricsForAgentMonth(
        agent.id,
        dateAppointed.toISOString().slice(0, 7),
        tx,
      );

      await logSystemAudit(
        {
          action: 'recruitment.create',
          userId: actor.sub,
          entityName: 'Recruitment',
          resourceId: created.id,
          newValue: {
            agentId: agent.id,
            agentCode,
            recruiter: input.recruiter ?? null,
            status: input.status,
          },
        },
        tx,
      );

      return created.id;
    });

    return this.getRecruitmentDetail(createdId, actor);
  }

  async updateRecruitment(
    id: string,
    input: UpdateManualRecruitment,
    actor: AuthTokenPayload,
  ): Promise<RecruitmentDetailResponse> {
    this.assertAdmin(actor);

    const [existing] = await db.select().from(recRecruitment).where(eq(recRecruitment.id, id)).limit(1);
    if (!existing) {
      throw new NotFoundError('Recruitment record not found.');
    }

    const nextAgentId = input.agentId ?? existing.agentId;
    const agent = await this.validateAgent(nextAgentId);
    const nextAgentCode = input.agentCode ?? agent.agentCode ?? existing.agentCode;
    const nextAgentName = input.agentName ?? agent.displayName ?? existing.agentName;
    const nextDateAppointed = input.dateAppointed ? new Date(input.dateAppointed) : existing.dateAppointed;
    const nextDateTerminated =
      input.dateTerminated !== undefined
        ? input.dateTerminated
          ? new Date(input.dateTerminated)
          : null
        : existing.dateTerminated;

    this.assertTerminationDate(nextDateAppointed, nextDateTerminated);
    await this.assertDuplicateActiveAgentCode(nextAgentCode, id);

    await withDbTransaction('recruitment.update', async (tx) => {
      await tx
        .update(recRecruitment)
        .set({
          agentId: nextAgentId,
          agentCode: nextAgentCode ?? null,
          agentName: nextAgentName ?? null,
          recruiter: input.recruiter ?? existing.recruiter,
          umCode: input.umCode ?? existing.umCode,
          umName: input.umName ?? existing.umName,
          bmCode: input.bmCode ?? existing.bmCode,
          bmName: input.bmName ?? existing.bmName,
          team: input.team ?? existing.team,
          birthday: input.birthday ?? existing.birthday,
          dateAppointed: nextDateAppointed,
          dateTerminated: nextDateTerminated,
          status: input.status ?? existing.status,
          contacts: input.contacts ?? existing.contacts,
          notes: 'notes' in input ? input.notes ?? null : existing.notes,
          updatedByUserId: actor.sub,
          updatedAtUtc: new Date(),
        })
        .where(eq(recRecruitment.id, id));

      if (
        existing.agentId !== nextAgentId ||
        existing.dateAppointed.toISOString().slice(0, 7) !== nextDateAppointed.toISOString().slice(0, 7)
      ) {
        await metricsService.applyManualRecruitmentMetricDelta(existing.agentId, existing.dateAppointed, -1, tx);
        await metricsService.applyManualRecruitmentMetricDelta(nextAgentId, nextDateAppointed, 1, tx);
      }

      await metricsService.recalculateManualMetricsForAgentMonth(
        existing.agentId,
        existing.dateAppointed.toISOString().slice(0, 7),
        tx,
      );
      await metricsService.recalculateManualMetricsForAgentMonth(
        nextAgentId,
        nextDateAppointed.toISOString().slice(0, 7),
        tx,
      );

      await logSystemAudit(
        {
          action: 'recruitment.update',
          userId: actor.sub,
          entityName: 'Recruitment',
          resourceId: id,
          oldValue: {
            agentId: existing.agentId,
            agentCode: existing.agentCode,
            status: existing.status,
          },
          newValue: {
            agentId: nextAgentId,
            agentCode: nextAgentCode,
            status: input.status ?? existing.status,
          },
        },
        tx,
      );

      await metricsService.recalculateManualMetricsForAgentMonth(
        existing.agentId,
        existing.dateAppointed.toISOString().slice(0, 7),
        tx,
      );
    });

    return this.getRecruitmentDetail(id, actor);
  }

  async terminateRecruitment(
    id: string,
    input: RecruitmentStatusAction,
    actor: AuthTokenPayload,
  ): Promise<RecruitmentDetailResponse> {
    this.assertAdmin(actor);
    const [existing] = await db.select().from(recRecruitment).where(eq(recRecruitment.id, id)).limit(1);
    if (!existing) {
      throw new NotFoundError('Recruitment record not found.');
    }

    const dateTerminated = input.dateTerminated ? new Date(input.dateTerminated) : new Date();
    this.assertTerminationDate(existing.dateAppointed, dateTerminated);

    await withDbTransaction('recruitment.terminate', async (tx) => {
      await tx
        .update(recRecruitment)
        .set({
          status: 'Terminated',
          dateTerminated,
          notes: input.notes ?? existing.notes,
          updatedByUserId: actor.sub,
          updatedAtUtc: new Date(),
        })
        .where(eq(recRecruitment.id, id));

      await logSystemAudit(
        {
          action: 'recruitment.terminate',
          userId: actor.sub,
          entityName: 'Recruitment',
          resourceId: id,
          oldValue: {
            status: existing.status,
            dateTerminated: existing.dateTerminated?.toISOString() ?? null,
          },
          newValue: {
            status: 'Terminated',
            dateTerminated: dateTerminated.toISOString(),
          },
        },
        tx,
      );

      await metricsService.recalculateManualMetricsForAgentMonth(
        existing.agentId,
        existing.dateAppointed.toISOString().slice(0, 7),
        tx,
      );
    });

    return this.getRecruitmentDetail(id, actor);
  }

  async reinstateRecruitment(
    id: string,
    input: RecruitmentStatusAction,
    actor: AuthTokenPayload,
  ): Promise<RecruitmentDetailResponse> {
    this.assertAdmin(actor);
    const [existing] = await db.select().from(recRecruitment).where(eq(recRecruitment.id, id)).limit(1);
    if (!existing) {
      throw new NotFoundError('Recruitment record not found.');
    }
    await this.assertDuplicateActiveAgentCode(existing.agentCode, id);

    await withDbTransaction('recruitment.reinstate', async (tx) => {
      await tx
        .update(recRecruitment)
        .set({
          status: 'Reinstated',
          dateTerminated: null,
          notes: input.notes ?? existing.notes,
          updatedByUserId: actor.sub,
          updatedAtUtc: new Date(),
        })
        .where(eq(recRecruitment.id, id));

      await logSystemAudit(
        {
          action: 'recruitment.reinstate',
          userId: actor.sub,
          entityName: 'Recruitment',
          resourceId: id,
          oldValue: {
            status: existing.status,
          },
          newValue: {
            status: 'Reinstated',
          },
        },
        tx,
      );
    });

    return this.getRecruitmentDetail(id, actor);
  }
}

export const adminRecruitmentService = new AdminRecruitmentService();
