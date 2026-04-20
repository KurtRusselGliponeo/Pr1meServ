import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }

  const sql = postgres(connectionString, {
    max: 1,
    prepare: process.env.DB_USE_PGBOUNCER?.trim() !== 'true',
  });

  try {
    const [agentRow] = await sql<{ AssignedAgentId: string | null }[]>`
      select "AssignedAgentId"
      from "ClientProfiles"
      where "AssignedAgentId" is not null and "DeletedAtUtc" is null
      limit 1
    `;
    const agentId = agentRow?.AssignedAgentId ?? null;
    const search = 'john';

    console.log('\n=== EXPLAIN ANALYZE: client profiles listing ===\n');
    const clientProfilesPlan = await sql`
      EXPLAIN ANALYZE
      SELECT "Id", "PolicyNumber", "UpdatedAtUtc"
      FROM "ClientProfiles"
      WHERE "DeletedAtUtc" IS NULL
        AND (${agentId}::uuid IS NULL OR "AssignedAgentId" = ${agentId}::uuid)
        AND "SearchVector" @@ websearch_to_tsquery('simple', ${search})
      ORDER BY ts_rank_cd("SearchVector", websearch_to_tsquery('simple', ${search})) DESC,
               "UpdatedAtUtc" DESC
      LIMIT 25
    `;
    for (const row of clientProfilesPlan as unknown as Array<{ 'QUERY PLAN': string }>) {
      console.log(row['QUERY PLAN']);
    }

    console.log('\n=== EXPLAIN ANALYZE: metrics aggregation ===\n');
    const metricsPlan = await sql`
      EXPLAIN ANALYZE
      SELECT
        "RecordMonth",
        sum("Api"),
        sum("ModalPremium"),
        sum("CommissionAmount")
      FROM "PerformanceMetrics"
      WHERE "RecordMonth" >= '2026-01'
        AND "RecordMonth" < '2026-05'
      GROUP BY "RecordMonth"
      ORDER BY "RecordMonth"
    `;
    for (const row of metricsPlan as unknown as Array<{ 'QUERY PLAN': string }>) {
      console.log(row['QUERY PLAN']);
    }
  } finally {
    await sql.end();
  }
}

void main();
