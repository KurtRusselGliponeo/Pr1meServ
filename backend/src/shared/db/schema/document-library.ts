import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { userAccounts } from './user-accounts';

export const documentLibrary = pgTable(
  'DocumentLibrary',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    uploadedByUserId: uuid('UploadedByUserId')
      .references(() => userAccounts.id)
      .notNull(),
    fileUrl: text('FileUrl').notNull(),
    category: varchar('Category', { length: 50 }).notNull(),
    mimeType: varchar('MimeType', { length: 50 }).notNull(),
    version: varchar('Version', { length: 16 }).default('1.0').notNull(),
    createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_doclibrary_userid').on(table.uploadedByUserId)],
);
