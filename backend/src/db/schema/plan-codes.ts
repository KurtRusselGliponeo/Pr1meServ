import { boolean, index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { userAccounts } from './user-accounts';

export const planCodes = pgTable(
  'PlanCodes',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    planCode: varchar('PlanCode', { length: 50 }).notNull().unique(),
    planName: varchar('PlanName', { length: 255 }).notNull(),
    productCategory: varchar('ProductCategory', { length: 120 }).notNull(),
    classification: varchar('Classification', { length: 20 }).notNull(),
    isActive: boolean('IsActive').default(true).notNull(),
    notes: text('Notes'),
    createdByUserId: uuid('CreatedByUserId').references(() => userAccounts.id),
    updatedByUserId: uuid('UpdatedByUserId').references(() => userAccounts.id),
    createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
    updatedAtUtc: timestamp('UpdatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_plancodes_category').on(table.productCategory),
    index('idx_plancodes_active').on(table.isActive),
  ],
);
