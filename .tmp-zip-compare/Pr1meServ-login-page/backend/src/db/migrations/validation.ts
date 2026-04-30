import { caseStatuses } from '@a1prime/schemas';
import { sql } from 'drizzle-orm';
import { db } from '../client';

export interface MigrationValidationSummary {
  status: 'ok' | 'degraded';
  checks: Array<{
    name: string;
    status: 'ok' | 'failed';
    details: string;
  }>;
}

export async function validateRequiredConstraints(): Promise<MigrationValidationSummary> {
  const requiredStatuses = caseStatuses.join("', '");
  const result = await db.execute<{ source: string; definition: string | null }>(sql`
    SELECT conname AS source, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE conname = 'chk_clientprofiles_casestatus'
  `);

  const definition = result[0]?.definition ?? null;
  const hasConstraint = Boolean(definition);
  const hasExpectedStatuses = Boolean(
    definition && caseStatuses.every((status) => definition.includes(`'${status}'`)),
  );

  const checks: MigrationValidationSummary['checks'] = [
    {
      name: 'client-profile-case-status-constraint',
      status: hasConstraint && hasExpectedStatuses ? 'ok' : 'failed',
      details:
        hasConstraint && hasExpectedStatuses
          ? `Constraint includes expected statuses: '${requiredStatuses}'.`
          : 'Missing or outdated chk_clientprofiles_casestatus constraint.',
    },
  ];

  return {
    status: checks.every((check) => check.status === 'ok') ? 'ok' : 'degraded',
    checks,
  };
}
