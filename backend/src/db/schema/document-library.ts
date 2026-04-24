import { boolean, index, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { userAccounts } from './user-accounts';

export const documentLibrary = pgTable(
  'DocumentLibrary',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    uploadedByUserId: uuid('UploadedByUserId')
      .references(() => userAccounts.id)
      .notNull(),
    fileUrl: text('FileUrl').notNull(),
    fileName: varchar('FileName', { length: 255 }).notNull(),
    originalFileName: varchar('OriginalFileName', { length: 255 }).default('document').notNull(),
    branchCode: varchar('BranchCode', { length: 50 }),
    category: varchar('Category', { length: 50 }).notNull(),
    mimeType: varchar('MimeType', { length: 50 }).notNull(),
    fileExtension: varchar('FileExtension', { length: 16 }).default('bin').notNull(),
    fileSizeBytes: integer('FileSizeBytes').default(0).notNull(),
    description: text('Description'),
    keywords: text('Keywords').default('').notNull(),
    version: varchar('Version', { length: 16 }).default('1.0').notNull(),
    versionGroup: varchar('VersionGroup', { length: 255 }).default('document').notNull(),
    isPinned: boolean('IsPinned').default(false).notNull(),
    isArchived: boolean('IsArchived').default(false).notNull(),
    archivedAtUtc: timestamp('ArchivedAtUtc', { withTimezone: true }),
    archivedByUserId: uuid('ArchivedByUserId').references(() => userAccounts.id),
    storageProvider: varchar('StorageProvider', { length: 32 }).default('GoogleDrive').notNull(),
    storageKey: text('StorageKey'),
    createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_doclibrary_userid').on(table.uploadedByUserId),
    index('idx_doclibrary_pinned').on(table.isPinned),
    index('idx_doclibrary_branch').on(table.branchCode),
    index('idx_doclibrary_version_group').on(table.versionGroup, table.isArchived),
  ],
);
