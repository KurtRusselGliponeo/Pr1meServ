import { and, asc, eq, ilike, ne, or } from 'drizzle-orm';
import type { CreatePlanCode, ListPlanCodesQuery, UpdatePlanCode } from '@a1prime/schemas';

import { db, withDbTransaction } from '@/db/client';
import { planCodes } from '@/schema';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { logSystemAudit } from '@/shared/lib/audit';
import type { AuthTokenPayload } from '@/shared/lib/auth';

export interface PlanCodeReference {
  id: string;
  planCode: string;
  planName: string;
  productCategory: string;
  classification: string;
  isActive: boolean;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

function assertAdmin(actor: AuthTokenPayload) {
  if (actor.role !== 'Admin') {
    throw new ForbiddenError('Admin access required.');
  }
}

function toReference(row: typeof planCodes.$inferSelect): PlanCodeReference {
  return {
    id: row.id,
    planCode: row.planCode,
    planName: row.planName,
    productCategory: row.productCategory,
    classification: row.classification,
    isActive: row.isActive,
    notes: row.notes,
    createdAtUtc: row.createdAtUtc.toISOString(),
    updatedAtUtc: row.updatedAtUtc.toISOString(),
  };
}

export class PlanCodesService {
  async listPlanCodes(query: ListPlanCodesQuery): Promise<PlanCodeReference[]> {
    const conditions = [];

    if (!query.includeInactive) {
      conditions.push(eq(planCodes.isActive, true));
    }

    if (query.productCategory) {
      conditions.push(eq(planCodes.productCategory, query.productCategory));
    }

    if (query.classification) {
      conditions.push(eq(planCodes.classification, query.classification));
    }

    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          ilike(planCodes.planCode, term),
          ilike(planCodes.planName, term),
          ilike(planCodes.productCategory, term),
        )!,
      );
    }

    const rows = await db
      .select()
      .from(planCodes)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(planCodes.planCode))
      .limit(500);

    return rows.map(toReference);
  }

  async getPlanCode(id: string): Promise<PlanCodeReference> {
    const [row] = await db.select().from(planCodes).where(eq(planCodes.id, id)).limit(1);

    if (!row) {
      throw new NotFoundError('Plan code not found.');
    }

    return toReference(row);
  }

  async createPlanCode(input: CreatePlanCode, actor: AuthTokenPayload): Promise<PlanCodeReference> {
    assertAdmin(actor);
    await this.assertNoDuplicateActiveCode(input.planCode);

    const [created] = await withDbTransaction('plan-code.create', async (tx) => {
      const [row] = await tx
        .insert(planCodes)
        .values({
          planCode: input.planCode,
          planName: input.planName,
          productCategory: input.productCategory,
          classification: input.classification,
          isActive: input.isActive,
          notes: input.notes ?? null,
          createdByUserId: actor.sub,
          updatedByUserId: actor.sub,
        })
        .returning();

      await logSystemAudit(
        {
          action: 'plan-code.create',
          userId: actor.sub,
          entityName: 'PlanCode',
          resourceId: row.id,
          newValue: {
            planCode: row.planCode,
            planName: row.planName,
            productCategory: row.productCategory,
            classification: row.classification,
            isActive: row.isActive,
          },
        },
        tx,
      );

      return [row];
    });

    return toReference(created);
  }

  async updatePlanCode(
    id: string,
    input: UpdatePlanCode,
    actor: AuthTokenPayload,
  ): Promise<PlanCodeReference> {
    assertAdmin(actor);

    const [existing] = await db.select().from(planCodes).where(eq(planCodes.id, id)).limit(1);

    if (!existing) {
      throw new NotFoundError('Plan code not found.');
    }

    const nextPlanCode = input.planCode ?? existing.planCode;
    const nextIsActive = input.isActive ?? existing.isActive;

    if (nextIsActive) {
      await this.assertNoDuplicateActiveCode(nextPlanCode, id);
    }

    const [updated] = await withDbTransaction('plan-code.update', async (tx) => {
      const [row] = await tx
        .update(planCodes)
        .set({
          ...(input.planCode !== undefined && { planCode: input.planCode }),
          ...(input.planName !== undefined && { planName: input.planName }),
          ...(input.productCategory !== undefined && { productCategory: input.productCategory }),
          ...(input.classification !== undefined && { classification: input.classification }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...('notes' in input && { notes: input.notes ?? null }),
          updatedByUserId: actor.sub,
          updatedAtUtc: new Date(),
        })
        .where(eq(planCodes.id, id))
        .returning();

      await logSystemAudit(
        {
          action: 'plan-code.update',
          userId: actor.sub,
          entityName: 'PlanCode',
          resourceId: id,
          oldValue: {
            planCode: existing.planCode,
            planName: existing.planName,
            productCategory: existing.productCategory,
            classification: existing.classification,
            isActive: existing.isActive,
          },
          newValue: input as Record<string, unknown>,
        },
        tx,
      );

      return [row];
    });

    return toReference(updated);
  }

  async deactivatePlanCode(id: string, actor: AuthTokenPayload): Promise<PlanCodeReference> {
    return this.setPlanCodeActiveStatus(id, false, actor);
  }

  async reactivatePlanCode(id: string, actor: AuthTokenPayload): Promise<PlanCodeReference> {
    return this.setPlanCodeActiveStatus(id, true, actor);
  }

  private async setPlanCodeActiveStatus(
    id: string,
    isActive: boolean,
    actor: AuthTokenPayload,
  ): Promise<PlanCodeReference> {
    assertAdmin(actor);

    const [existing] = await db.select().from(planCodes).where(eq(planCodes.id, id)).limit(1);

    if (!existing) {
      throw new NotFoundError('Plan code not found.');
    }

    if (isActive) {
      await this.assertNoDuplicateActiveCode(existing.planCode, id);
    }

    const [updated] = await withDbTransaction(`plan-code.${isActive ? 'reactivate' : 'deactivate'}`, async (tx) => {
      const [row] = await tx
        .update(planCodes)
        .set({
          isActive,
          updatedByUserId: actor.sub,
          updatedAtUtc: new Date(),
        })
        .where(eq(planCodes.id, id))
        .returning();

      await logSystemAudit(
        {
          action: isActive ? 'plan-code.reactivate' : 'plan-code.deactivate',
          userId: actor.sub,
          entityName: 'PlanCode',
          resourceId: id,
          oldValue: { isActive: existing.isActive },
          newValue: { isActive },
        },
        tx,
      );

      return [row];
    });

    return toReference(updated);
  }

  private async assertNoDuplicateActiveCode(planCode: string, excludeId?: string): Promise<void> {
    const conditions = [eq(planCodes.planCode, planCode), eq(planCodes.isActive, true)];

    if (excludeId) {
      conditions.push(ne(planCodes.id, excludeId));
    }

    const [existing] = await db
      .select({ id: planCodes.id })
      .from(planCodes)
      .where(and(...conditions))
      .limit(1);

    if (existing) {
      throw new BadRequestError(`Active plan code ${planCode} already exists.`);
    }
  }
}

export const planCodesService = new PlanCodesService();
