import { and, asc, eq, ilike, isNull, or } from 'drizzle-orm';
import { db, withDbTransaction } from '@/db/client';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { agentProfiles, clientProfiles, userAccounts } from '@/schema';
import { logSystemAudit } from '@/shared/lib/audit';
import type { AuthTokenPayload } from '@/shared/lib/auth';

export interface PolicyRecordRow {
  id: string;
  agentId: string;
  agentName: string;
  agentCode: string;
  clientName: string;
  policyNumber: string;
  productType: string | null;
  planCode: string | null;
  modalPremium: string;
  api: string;
  sumAssured: string;
  commissionAmount: string;
  caseStatus: string;
  policyStatus: string;
  dateIssued: string | null;
  dateClosed: string | null;
  notes: string | null;
  branchCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePolicyRecordInput {
  agentId: string;
  firstName: string;
  lastName: string;
  policyNumber: string;
  productType?: string;
  planCode?: string;
  modalPremium: number;
  api: number;
  sumAssured: number;
  commissionAmount: number;
  caseStatus: string;
  policyStatus: string;
  dateIssued?: string;
  dateClosed?: string;
  notes?: string;
  branchCode?: string;
}

export interface UpdatePolicyRecordInput {
  firstName?: string;
  lastName?: string;
  productType?: string | null;
  planCode?: string | null;
  modalPremium?: number;
  api?: number;
  sumAssured?: number;
  commissionAmount?: number;
  caseStatus?: string;
  policyStatus?: string;
  dateIssued?: string | null;
  dateClosed?: string | null;
  notes?: string | null;
  branchCode?: string;
}

const VALID_CASE_STATUSES = ['Uncontacted', 'Contacted', 'Forms Submitted', 'BM Signed', 'Done', 'Returned', 'Orphan'];
const VALID_POLICY_STATUSES = ['Active', 'Lapsed', 'Cancelled', 'Matured'];

export class AdminPolicyService {
  async listPolicies(agentId: string | undefined, search: string | undefined, actor: AuthTokenPayload) {
    if (actor.role !== 'Admin') throw new ForbiddenError('Admin access required.');

    const conditions = [isNull(clientProfiles.deletedAtUtc)];

    if (agentId) {
      conditions.push(eq(clientProfiles.assignedAgentId, agentId));
    }

    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(clientProfiles.firstName, term),
          ilike(clientProfiles.lastName, term),
          ilike(clientProfiles.policyNumber, term),
        )!,
      );
    }

    const rows = await db
      .select({
        id: clientProfiles.id,
        agentId: agentProfiles.id,
        agentFirstName: userAccounts.firstName,
        agentLastName: userAccounts.lastName,
        agentCode: agentProfiles.agentCode,
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
        dateIssued: clientProfiles.dateIssued,
        dateClosed: clientProfiles.dateClosed,
        notes: clientProfiles.notes,
        branchCode: clientProfiles.branchCode,
        createdAt: clientProfiles.createdAt,
        updatedAt: clientProfiles.updatedAt,
      })
      .from(clientProfiles)
      .leftJoin(agentProfiles, eq(clientProfiles.assignedAgentId, agentProfiles.id))
      .leftJoin(userAccounts, eq(agentProfiles.userId, userAccounts.id))
      .where(and(...conditions))
      .orderBy(asc(clientProfiles.createdAt))
      .limit(200);

    return rows.map((row) => ({
      id: row.id,
      agentId: row.agentId ?? null,
      agentName: row.agentFirstName && row.agentLastName
        ? `${row.agentFirstName} ${row.agentLastName}`
        : 'Orphan Pool',
      agentCode: row.agentCode ?? 'N/A',
      clientName: `${row.firstName} ${row.lastName}`,
      policyNumber: row.policyNumber,
      productType: row.productType,
      planCode: row.planCode,
      modalPremium: row.modalPremium,
      api: row.api,
      sumAssured: row.sumAssured,
      commissionAmount: row.commissionAmount,
      caseStatus: row.caseStatus,
      policyStatus: row.policyStatus,
      dateIssued: row.dateIssued,
      dateClosed: row.dateClosed,
      notes: row.notes,
      branchCode: row.branchCode,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async createPolicy(input: CreatePolicyRecordInput, actor: AuthTokenPayload): Promise<{ id: string }> {
    if (actor.role !== 'Admin') throw new ForbiddenError('Admin access required.');

    if (!VALID_CASE_STATUSES.includes(input.caseStatus)) {
      throw new BadRequestError(`Invalid caseStatus: ${input.caseStatus}`);
    }
    if (!VALID_POLICY_STATUSES.includes(input.policyStatus)) {
      throw new BadRequestError(`Invalid policyStatus: ${input.policyStatus}`);
    }

    // Verify agent exists
    const [agent] = await db
      .select({ id: agentProfiles.id })
      .from(agentProfiles)
      .where(and(eq(agentProfiles.id, input.agentId), isNull(agentProfiles.deletedAtUtc)))
      .limit(1);

    if (!agent) throw new NotFoundError('Agent not found.');

    const [existing] = await db
      .select({ id: clientProfiles.id })
      .from(clientProfiles)
      .where(eq(clientProfiles.policyNumber, input.policyNumber))
      .limit(1);

    if (existing) throw new BadRequestError(`Policy number ${input.policyNumber} already exists.`);

    const [inserted] = await withDbTransaction('admin.policy.create', async (tx) => {
      const [row] = await tx.insert(clientProfiles).values({
        assignedAgentId: input.agentId,
        firstName: input.firstName,
        lastName: input.lastName,
        policyNumber: input.policyNumber,
        productType: input.productType ?? null,
        planCode: input.planCode ?? null,
        modalPremium: String(input.modalPremium),
        api: String(input.api),
        sumAssured: String(input.sumAssured),
        commissionAmount: String(input.commissionAmount),
        caseStatus: input.caseStatus as never,
        policyStatus: input.policyStatus as never,
        dateIssued: input.dateIssued ?? null,
        dateClosed: input.dateClosed ?? null,
        notes: input.notes ?? null,
        branchCode: input.branchCode ?? 'A1PRIME',
      }).returning({ id: clientProfiles.id });

      await logSystemAudit({
        action: 'admin.policy.create',
        userId: actor.sub,
        entityName: 'ClientProfile',
        resourceId: row.id,
        newValue: { policyNumber: input.policyNumber, agentId: input.agentId },
      }, tx);

      return [row];
    });

    return { id: inserted.id };
  }

  async updatePolicy(clientProfileId: string, input: UpdatePolicyRecordInput, actor: AuthTokenPayload): Promise<void> {
    if (actor.role !== 'Admin') throw new ForbiddenError('Admin access required.');

    const [existing] = await db
      .select({ id: clientProfiles.id })
      .from(clientProfiles)
      .where(and(eq(clientProfiles.id, clientProfileId), isNull(clientProfiles.deletedAtUtc)))
      .limit(1);

    if (!existing) throw new NotFoundError('Policy record not found.');

    if (input.caseStatus && !VALID_CASE_STATUSES.includes(input.caseStatus)) {
      throw new BadRequestError(`Invalid caseStatus: ${input.caseStatus}`);
    }
    if (input.policyStatus && !VALID_POLICY_STATUSES.includes(input.policyStatus)) {
      throw new BadRequestError(`Invalid policyStatus: ${input.policyStatus}`);
    }

    await withDbTransaction('admin.policy.update', async (tx) => {
      await tx.update(clientProfiles).set({
        ...(input.firstName !== undefined && { firstName: input.firstName }),
        ...(input.lastName !== undefined && { lastName: input.lastName }),
        ...(input.productType !== undefined && { productType: input.productType }),
        ...(input.planCode !== undefined && { planCode: input.planCode }),
        ...(input.modalPremium !== undefined && { modalPremium: String(input.modalPremium) }),
        ...(input.api !== undefined && { api: String(input.api) }),
        ...(input.sumAssured !== undefined && { sumAssured: String(input.sumAssured) }),
        ...(input.commissionAmount !== undefined && { commissionAmount: String(input.commissionAmount) }),
        ...(input.caseStatus !== undefined && { caseStatus: input.caseStatus as never }),
        ...(input.policyStatus !== undefined && { policyStatus: input.policyStatus as never }),
        ...('dateIssued' in input && { dateIssued: input.dateIssued ?? null }),
        ...('dateClosed' in input && { dateClosed: input.dateClosed ?? null }),
        ...('notes' in input && { notes: input.notes ?? null }),
        ...(input.branchCode !== undefined && { branchCode: input.branchCode }),
        updatedAt: new Date(),
      }).where(eq(clientProfiles.id, clientProfileId));

      await logSystemAudit({
        action: 'admin.policy.update',
        userId: actor.sub,
        entityName: 'ClientProfile',
        resourceId: clientProfileId,
        newValue: input as Record<string, unknown>,
      }, tx);
    });
  }

  async deletePolicy(clientProfileId: string, actor: AuthTokenPayload): Promise<void> {
    if (actor.role !== 'Admin') throw new ForbiddenError('Admin access required.');

    const [existing] = await db
      .select({ id: clientProfiles.id })
      .from(clientProfiles)
      .where(and(eq(clientProfiles.id, clientProfileId), isNull(clientProfiles.deletedAtUtc)))
      .limit(1);

    if (!existing) throw new NotFoundError('Policy record not found.');

    await withDbTransaction('admin.policy.delete', async (tx) => {
      await tx.update(clientProfiles)
        .set({ deletedAtUtc: new Date(), updatedAt: new Date() })
        .where(eq(clientProfiles.id, clientProfileId));

      await logSystemAudit({
        action: 'admin.policy.delete',
        userId: actor.sub,
        entityName: 'ClientProfile',
        resourceId: clientProfileId,
      }, tx);
    });
  }
}

export const adminPolicyService = new AdminPolicyService();
