import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { userAccounts } from './user-accounts';

export const dataValidationIssues = pgTable(
  'DataValidationIssues',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    module: varchar('Module', { length: 50 }).notNull(),
    entityName: varchar('EntityName', { length: 100 }),
    entityId: uuid('EntityId'),
    issueCode: varchar('IssueCode', { length: 80 }).notNull(),
    severity: varchar('Severity', { length: 20 }).default('error').notNull(),
    status: varchar('Status', { length: 20 }).default('Open').notNull(),
    details: text('Details').notNull(),
    recommendedFix: text('RecommendedFix'),
    rawPayload: jsonb('RawPayload').$type<Record<string, unknown> | null>(),
    createdByUserId: uuid('CreatedByUserId').references(() => userAccounts.id),
    resolvedByUserId: uuid('ResolvedByUserId').references(() => userAccounts.id),
    resolvedAtUtc: timestamp('ResolvedAtUtc', { withTimezone: true }),
    createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
    updatedAtUtc: timestamp('UpdatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_datavalidationissues_module').on(table.module),
    index('idx_datavalidationissues_status').on(table.status),
    index('idx_datavalidationissues_entity').on(table.entityName, table.entityId),
    index('idx_datavalidationissues_code').on(table.issueCode),
  ],
);
