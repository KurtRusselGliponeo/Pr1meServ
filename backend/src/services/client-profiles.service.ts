import { and, eq, isNull, sql } from 'drizzle-orm';

import type {
  ClientProfile,
  ListClientProfilesQuery,
  ListClientProfilesResponse,
} from '@a1prime/schemas';
import { ForbiddenError } from '@/lib/errors';
import { db } from '@/db/client';
import { clientProfiles } from '@/schema';
import type { AuthTokenPayload } from '@/shared/lib/auth';

type ClientProfileRow = {
  id: string;
  assignedAgentId: string;
  firstName: string;
  lastName: string;
  policyNumber: string;
  modalPremium: string;
  api: string;
  sumAssured: string;
  commissionAmount: string;
  caseStatus: ClientProfile['caseStatus'];
  policyStatus: ClientProfile['policyStatus'];
  createdAtUtc: Date;
  updatedAtUtc: Date;
};

/**
 * Provides scoped client profile list operations for COSAF endpoints.
 */
export class ClientProfilesService {
  /**
   * Lists paginated client profiles for the authenticated actor.
   *
   * Development EXPLAIN ANALYZE reference:
   * Index Scan using idx_clientprofiles_agent_status on "ClientProfiles"
   *   Index Cond: (("AssignedAgentId" = $1) AND ("PolicyStatus" = $2))
   *   Filter: ("DeletedAtUtc" IS NULL)
   *
   * @param query Validated query string filters and pagination settings.
   * @param actorUser Authenticated JWT payload.
   * @returns ListClientProfilesResponse
   * @throws {ForbiddenError} if an Agent token is missing its agent scope.
   */
  async listClientProfiles(
    query: ListClientProfilesQuery,
    actorUser: AuthTokenPayload,
  ): Promise<ListClientProfilesResponse> {
    const page = query.page;
    const pageSize = query.pageSize;
    const offset = (page - 1) * pageSize;

    const conditions = [isNull(clientProfiles.deletedAtUtc)];

    if (actorUser.role === 'Agent') {
      if (!actorUser.agentId) {
        throw new ForbiddenError('Agents must be linked to an agent profile.');
      }

      conditions.push(eq(clientProfiles.assignedAgentId, actorUser.agentId));
    } else if (query.agentId) {
      conditions.push(eq(clientProfiles.assignedAgentId, query.agentId));
    }

    if (query.status) {
      conditions.push(eq(clientProfiles.caseStatus, query.status));
    }

    const whereClause = and(...conditions);

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: clientProfiles.id,
          assignedAgentId: clientProfiles.assignedAgentId,
          firstName: clientProfiles.firstName,
          lastName: clientProfiles.lastName,
          policyNumber: clientProfiles.policyNumber,
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
        .where(whereClause)
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

  private mapClientProfile(row: ClientProfileRow): ClientProfile {
    return {
      id: row.id,
      assignedAgentId: row.assignedAgentId,
      firstName: row.firstName,
      lastName: row.lastName,
      policyNumber: row.policyNumber,
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
}

export const clientProfilesService = new ClientProfilesService();
