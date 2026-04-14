import type { Sql } from 'postgres';

import type { MigrationDefinition } from './types';

const upStatements = [
  'CREATE EXTENSION IF NOT EXISTS pgcrypto',
  `CREATE TABLE IF NOT EXISTS "UserAccounts" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "EmailHash" varchar(64) NOT NULL,
    "Email" text NOT NULL,
    "PasswordHash" varchar(255) NOT NULL,
    "RefreshTokenHash" varchar(64),
    "RefreshTokenExpiresAtUtc" timestamptz,
    "FirstName" varchar(100) NOT NULL,
    "LastName" varchar(100) NOT NULL,
    "SystemRole" varchar(32) NOT NULL,
    "CreatedAtUtc" timestamptz DEFAULT NOW() NOT NULL,
    "UpdatedAtUtc" timestamptz DEFAULT NOW() NOT NULL,
    "DeletedAtUtc" timestamptz,
    CONSTRAINT "ux_useraccounts_emailhash" UNIQUE ("EmailHash"),
    CONSTRAINT "chk_useraccounts_systemrole" CHECK ("SystemRole" IN ('Admin', 'BranchManager', 'Agent'))
  )`,
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_useracounts_active ON "UserAccounts"("Id") WHERE "DeletedAtUtc" IS NULL',
];

const downStatements = [
  'DROP INDEX CONCURRENTLY IF EXISTS idx_useracounts_active',
  'DROP TABLE IF EXISTS "UserAccounts"',
];

export const userAccountsMigration: MigrationDefinition = {
  id: '001_UserAccounts',
  async up(sql: Sql) {
    // Raw SQL is required because Drizzle does not model explicit CHECK constraints,
    // partial indexes with CONCURRENTLY, or reversible up/down migrations as first-class APIs.
    for (const statement of upStatements) {
      await sql.unsafe(statement);
    }
  },
  async down(sql: Sql) {
    // Raw SQL is required here to guarantee explicit index teardown before dropping the table.
    for (const statement of downStatements) {
      await sql.unsafe(statement);
    }
  },
};
