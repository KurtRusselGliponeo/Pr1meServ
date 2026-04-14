import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { userAccounts } from './user-accounts';

export const agentProfiles = pgTable('AgentProfiles', {
  id: uuid('Id').primaryKey().defaultRandom(),
  userId: uuid('UserId')
    .references(() => userAccounts.id)
    .notNull()
    .unique(),
  agentCode: varchar('AgentCode', { length: 50 }).notNull().unique(),
  displayName: varchar('DisplayName', { length: 200 }).notNull(),
  createdAt: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('UpdatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  deletedAtUtc: timestamp('DeletedAtUtc', { withTimezone: true }),
});
