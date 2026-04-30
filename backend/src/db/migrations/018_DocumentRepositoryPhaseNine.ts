import type { Sql } from 'postgres';

import type { MigrationDefinition } from './types';

const upStatements = [
  `ALTER TABLE "DocumentLibrary" ADD COLUMN IF NOT EXISTS "OriginalFileName" varchar(255) DEFAULT 'document' NOT NULL`,
  `ALTER TABLE "DocumentLibrary" ADD COLUMN IF NOT EXISTS "BranchCode" varchar(50)`,
  `ALTER TABLE "DocumentLibrary" ADD COLUMN IF NOT EXISTS "FileExtension" varchar(16) DEFAULT 'bin' NOT NULL`,
  `ALTER TABLE "DocumentLibrary" ADD COLUMN IF NOT EXISTS "FileSizeBytes" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "DocumentLibrary" ADD COLUMN IF NOT EXISTS "Description" text`,
  `ALTER TABLE "DocumentLibrary" ADD COLUMN IF NOT EXISTS "Keywords" text DEFAULT '' NOT NULL`,
  `ALTER TABLE "DocumentLibrary" ADD COLUMN IF NOT EXISTS "VersionGroup" varchar(255) DEFAULT 'document' NOT NULL`,
  `ALTER TABLE "DocumentLibrary" ADD COLUMN IF NOT EXISTS "IsArchived" boolean DEFAULT false NOT NULL`,
  `ALTER TABLE "DocumentLibrary" ADD COLUMN IF NOT EXISTS "ArchivedAtUtc" timestamptz`,
  `ALTER TABLE "DocumentLibrary" ADD COLUMN IF NOT EXISTS "ArchivedByUserId" uuid REFERENCES "UserAccounts"("Id")`,
  `ALTER TABLE "DocumentLibrary" ADD COLUMN IF NOT EXISTS "StorageProvider" varchar(32) DEFAULT 'GoogleDrive' NOT NULL`,
  `ALTER TABLE "DocumentLibrary" ADD COLUMN IF NOT EXISTS "StorageKey" text`,
  `UPDATE "DocumentLibrary" SET "OriginalFileName" = COALESCE(NULLIF("FileName", ''), 'document') WHERE "OriginalFileName" = 'document'`,
  `UPDATE "DocumentLibrary" SET "VersionGroup" = lower(regexp_replace(COALESCE("FileName", 'document'), '\\.[^.]+$', '', 'g')) WHERE "VersionGroup" = 'document'`,
  `UPDATE "DocumentLibrary" SET "FileExtension" = COALESCE(NULLIF(split_part("FileName", '.', array_length(string_to_array("FileName", '.'), 1)), ''), 'bin') WHERE "FileExtension" = 'bin'`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_doclibrary_branch ON "DocumentLibrary"("BranchCode")`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_doclibrary_version_group ON "DocumentLibrary"("VersionGroup", "IsArchived")`,
];

const downStatements = [
  `DROP INDEX CONCURRENTLY IF EXISTS idx_doclibrary_version_group`,
  `DROP INDEX CONCURRENTLY IF EXISTS idx_doclibrary_branch`,
  `ALTER TABLE "DocumentLibrary" DROP COLUMN IF EXISTS "StorageKey"`,
  `ALTER TABLE "DocumentLibrary" DROP COLUMN IF EXISTS "StorageProvider"`,
  `ALTER TABLE "DocumentLibrary" DROP COLUMN IF EXISTS "ArchivedByUserId"`,
  `ALTER TABLE "DocumentLibrary" DROP COLUMN IF EXISTS "ArchivedAtUtc"`,
  `ALTER TABLE "DocumentLibrary" DROP COLUMN IF EXISTS "IsArchived"`,
  `ALTER TABLE "DocumentLibrary" DROP COLUMN IF EXISTS "VersionGroup"`,
  `ALTER TABLE "DocumentLibrary" DROP COLUMN IF EXISTS "Keywords"`,
  `ALTER TABLE "DocumentLibrary" DROP COLUMN IF EXISTS "Description"`,
  `ALTER TABLE "DocumentLibrary" DROP COLUMN IF EXISTS "FileSizeBytes"`,
  `ALTER TABLE "DocumentLibrary" DROP COLUMN IF EXISTS "FileExtension"`,
  `ALTER TABLE "DocumentLibrary" DROP COLUMN IF EXISTS "BranchCode"`,
  `ALTER TABLE "DocumentLibrary" DROP COLUMN IF EXISTS "OriginalFileName"`,
];

export const documentRepositoryPhaseNineMigration: MigrationDefinition = {
  id: '018_DocumentRepositoryPhaseNine',
  async up(sql: Sql) {
    for (const statement of upStatements) {
      await sql.unsafe(statement);
    }
  },
  async down(sql: Sql) {
    for (const statement of downStatements) {
      await sql.unsafe(statement);
    }
  },
};
