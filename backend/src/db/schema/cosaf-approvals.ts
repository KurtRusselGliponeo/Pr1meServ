import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { clientProfiles } from './client-profiles';
import { userAccounts } from './user-accounts';

export const cosafApprovals = pgTable(
  'CosafApprovals',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    clientProfileId: uuid('ClientProfileId')
      .references(() => clientProfiles.id)
      .notNull(),
    reviewingBmId: uuid('ReviewingBmId')
      .references(() => userAccounts.id)
      .notNull(),
    status: varchar('Status', { length: 20 }).default('PENDING').notNull(),
    reason: varchar('Reason', { length: 500 }),
    createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_cosafapprovals_clientprofileid').on(table.clientProfileId),
    index('idx_cosafapprovals_reviewingbmid').on(table.reviewingBmId),
  ],
);
