import type { Sql } from 'postgres';

import type { MigrationDefinition } from './types';

const upStatements = [
  // Local fresh-install compatibility:
  // older environments already had DocumentLibrary, but a clean local database does not.
  `CREATE TABLE IF NOT EXISTS "DocumentLibrary" (
     "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
     "UploadedByUserId" uuid NOT NULL REFERENCES "UserAccounts"("Id"),
     "FileUrl" text NOT NULL,
     "Category" varchar(50) NOT NULL,
     "MimeType" varchar(50) NOT NULL,
     "Version" varchar(16) DEFAULT '1.0' NOT NULL,
     "CreatedAtUtc" timestamptz DEFAULT now() NOT NULL
   )`,
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_doclibrary_userid ON "DocumentLibrary"("UploadedByUserId")',
  `ALTER TABLE "DocumentLibrary"
   ADD COLUMN IF NOT EXISTS "FileName" varchar(255)`,
  `UPDATE "DocumentLibrary"
   SET "FileName" = COALESCE(
     NULLIF(split_part("FileUrl", '/', array_length(string_to_array("FileUrl", '/'), 1)), ''),
     'document'
   )
   WHERE "FileName" IS NULL`,
  `ALTER TABLE "DocumentLibrary"
   ALTER COLUMN "FileName" SET NOT NULL`,
  `ALTER TABLE "DocumentLibrary"
   ADD COLUMN IF NOT EXISTS "IsPinned" boolean DEFAULT false NOT NULL`,
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_doclibrary_pinned ON "DocumentLibrary"("IsPinned")',
];

const downStatements = [
  'DROP INDEX CONCURRENTLY IF EXISTS idx_doclibrary_pinned',
  'DROP INDEX CONCURRENTLY IF EXISTS idx_doclibrary_userid',
  'ALTER TABLE "DocumentLibrary" DROP COLUMN IF EXISTS "IsPinned"',
  'ALTER TABLE "DocumentLibrary" DROP COLUMN IF EXISTS "FileName"',
];

export const documentLibraryEnhancementsMigration: MigrationDefinition = {
  id: '007_DocumentLibraryEnhancements',
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
