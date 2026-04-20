import type { Sql } from 'postgres';

import type { MigrationDefinition } from './types';

const upStatements = [
  `CREATE TABLE IF NOT EXISTS "SystemAuditLogs" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "ActorUserId" uuid,
    "Action" text NOT NULL,
    "EntityName" text NOT NULL,
    "EntityId" uuid,
    "OldValue" jsonb,
    "NewValue" jsonb,
    "CreatedAtUtc" timestamptz DEFAULT NOW() NOT NULL,
    CONSTRAINT "fk_auditlogs_actoruserid" FOREIGN KEY ("ActorUserId") REFERENCES "UserAccounts"("Id") ON DELETE RESTRICT
  )`,
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auditlogs_actoruserid ON "SystemAuditLogs"("ActorUserId")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auditlogs_oldvalue ON "SystemAuditLogs" USING GIN("OldValue")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auditlogs_newvalue ON "SystemAuditLogs" USING GIN("NewValue")',
];

const downStatements = [
  'DROP INDEX CONCURRENTLY IF EXISTS idx_auditlogs_newvalue',
  'DROP INDEX CONCURRENTLY IF EXISTS idx_auditlogs_oldvalue',
  'DROP INDEX CONCURRENTLY IF EXISTS idx_auditlogs_actoruserid',
  'ALTER TABLE IF EXISTS "SystemAuditLogs" DROP CONSTRAINT IF EXISTS "fk_auditlogs_actoruserid"',
  'DROP TABLE IF EXISTS "SystemAuditLogs"',
];

export const systemAuditLogsMigration: MigrationDefinition = {
  id: '005_SystemAuditLogs',
  async up(sql: Sql) {
    // Raw SQL is required because GIN indexes with CONCURRENTLY and explicit reversible migrations are not modeled by Drizzle ORM.
    for (const statement of upStatements) {
      await sql.unsafe(statement);
    }
  },
  async down(sql: Sql) {
    // Raw SQL is required to remove each index and the FK explicitly before the table is dropped.
    for (const statement of downStatements) {
      await sql.unsafe(statement);
    }
  },
};
