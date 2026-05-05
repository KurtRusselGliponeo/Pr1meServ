import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { ForbiddenError } from '@/lib/errors';
import { agentProfiles, clientProfiles, userAccounts } from '@/schema';
import type { AuthTokenPayload } from '@/shared/lib/auth';

export interface ListPoliciesInput {
  page: number;
  pageSize: number;
  search?: string;
  agentId?: string;
  branchCode?: string;
}

export interface PolicyInventoryRecord {
  id: string;
  agentId: string | null;
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

export interface ListPoliciesResponse {
  data: PolicyInventoryRecord[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
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

  async listPolicies(input: ListPoliciesInput, actor: AuthTokenPayload): Promise<ListPoliciesResponse> {
    const page = input.page;
    const pageSize = input.pageSize;
    const offset = (page - 1) * pageSize;
    const conditions = [isNull(clientProfiles.deletedAtUtc)];
    const trimmedSearch = input.search?.trim();

    if (actor.role === 'Agent') {
      if (!actor.agentId) {
        throw new ForbiddenError('Agents must be linked to an agent profile.');
      }

      conditions.push(eq(clientProfiles.assignedAgentId, actor.agentId));
    } else if (actor.role === 'BranchManager') {
      const branchCode = await this.getActorBranchCode(actor);

      if (!branchCode) {
        throw new ForbiddenError('Branch Managers must be linked to a branch profile.');
      }

      conditions.push(eq(clientProfiles.branchCode, branchCode));
    } else {
      if (input.agentId) {
        conditions.push(eq(clientProfiles.assignedAgentId, input.agentId));
      }

      if (input.branchCode?.trim()) {
        conditions.push(eq(clientProfiles.branchCode, input.branchCode.trim()));
      }
    }

    if (trimmedSearch) {
      const term = `%${trimmedSearch}%`;
      conditions.push(
        or(
          ilike(clientProfiles.firstName, term),
          ilike(clientProfiles.lastName, term),
          ilike(clientProfiles.policyNumber, term),
          ilike(clientProfiles.productType, term),
          ilike(clientProfiles.planCode, term),
        )!,
      );
    }

    const whereClause = and(...conditions);
    const [rows, totalRows] = await Promise.all([
      db
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
        .where(whereClause)
        .orderBy(desc(clientProfiles.updatedAt), desc(clientProfiles.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({
          total: sql<number>`count(*)::int`,
        })
        .from(clientProfiles)
        .leftJoin(agentProfiles, eq(clientProfiles.assignedAgentId, agentProfiles.id))
        .leftJoin(userAccounts, eq(agentProfiles.userId, userAccounts.id))
        .where(whereClause),
    ]);

    const total = totalRows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      data: rows.map((row) => ({
        id: row.id,
        agentId: row.agentId ?? null,
        agentName:
          row.agentFirstName && row.agentLastName
            ? `${row.agentFirstName} ${row.agentLastName}`
            : 'Orphan Pool',
        agentCode: row.agentCode ?? 'N/A',
        clientName: `${row.firstName} ${row.lastName}`.trim(),
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
      })),
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
}

export const policiesService = new PoliciesService();
