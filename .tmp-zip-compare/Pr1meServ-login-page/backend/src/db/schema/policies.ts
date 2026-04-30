import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { clientProfiles } from './client-profiles';

export const policies = pgTable(
  'Policies',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    clientProfileId: uuid('ClientProfileId')
      .references(() => clientProfiles.id)
      .notNull(),
    policyNumber: varchar('PolicyNumber', { length: 50 }).notNull().unique(),
    branchCode: varchar('BranchCode', { length: 50 }).notNull(),
    productType: varchar('ProductType', { length: 120 }),
    planCode: varchar('PlanCode', { length: 50 }),
    createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
    updatedAtUtc: timestamp('UpdatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_policies_clientprofileid').on(table.clientProfileId),
    index('idx_policies_branchcode').on(table.branchCode),
  ],
);
