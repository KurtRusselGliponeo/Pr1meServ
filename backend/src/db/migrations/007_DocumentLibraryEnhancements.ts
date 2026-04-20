import type { Sql } from 'postgres';

import type { MigrationDefinition } from './types';

const upStatements = [
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
