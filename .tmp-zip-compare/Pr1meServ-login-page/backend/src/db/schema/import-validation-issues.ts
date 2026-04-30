import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const importValidationIssues = pgTable(
  'ImportValidationIssues',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    sourceType: varchar('SourceType', { length: 20 }).notNull(),
    issueCode: varchar('IssueCode', { length: 80 }).notNull(),
    severity: varchar('Severity', { length: 20 }).notNull().default('error'),
    externalKey: varchar('ExternalKey', { length: 255 }),
    details: text('Details').notNull(),
    rawPayload: text('RawPayload'),
    createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_importissues_source').on(table.sourceType),
    index('idx_importissues_code').on(table.issueCode),
  ],
);
