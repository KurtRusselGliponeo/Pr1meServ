import { eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { ForbiddenError } from '@/lib/errors';
import {
  dataValidationIssues,
  performanceMetrics,
  policies,
  recRecruitment,
} from '@/schema';
import type { AuthTokenPayload } from '@/shared/lib/auth';

function currentRecordMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export class AdminDataCenterService {
  async getSummary(actor: AuthTokenPayload) {
    if (actor.role !== 'Admin') {
      throw new ForbiddenError('Admin access required.');
    }

    const recordMonth = currentRecordMonth();

    const [policyCounts, metricRows, validationRows, lapsationRows, recruitmentRows] = await Promise.all([
      db
        .select({
          issued: sql<number>`count(*)::int`,
        })
        .from(policies),
      db
        .select({
          totalNap: sql<string>`coalesce(sum(${performanceMetrics.api}), 0)::text`,
          totalApe: sql<string>`coalesce(sum(${performanceMetrics.modalPremium}), 0)::text`,
        })
        .from(performanceMetrics)
        .where(eq(performanceMetrics.recordMonth, recordMonth)),
      db
        .select({
          active: sql<number>`count(*) filter (where ${dataValidationIssues.status} = 'Open')::int`,
        })
        .from(dataValidationIssues),
      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(policies)
        .where(inArray(policies.policyStatus, ['At Risk', 'Lapsed'])),
      db
        .select({
          count: sql<number>`count(*) filter (where ${recRecruitment.status} in ('Active', 'Reinstated'))::int`,
        })
        .from(recRecruitment),
    ]);

    return {
      generatedAtUtc: new Date().toISOString(),
      cards: {
        policiesIssued: policyCounts[0]?.issued ?? 0,
        totalNap: Number(metricRows[0]?.totalNap ?? '0'),
        totalApeApi: Number(metricRows[0]?.totalApe ?? '0') + Number(metricRows[0]?.totalNap ?? '0'),
        activeValidationIssues: validationRows[0]?.active ?? 0,
        lapsedOrAtRiskPolicies: lapsationRows[0]?.count ?? 0,
        recruitmentCount: recruitmentRows[0]?.count ?? 0,
      },
    };
  }
}

export const adminDataCenterService = new AdminDataCenterService();
