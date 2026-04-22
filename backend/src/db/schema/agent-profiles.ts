import { relations } from 'drizzle-orm';
import { index, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { ape } from './ape';
import { nap } from './nap';
import { per } from './per';
import { rec } from './rec';
import { userAccounts } from './user-accounts';

export const agentStatusEnum = pgEnum('agent_status', ['Active', 'Terminated']);

export const agentProfiles = pgTable(
  'AgentProfiles',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    userId: uuid('UserId')
      .references(() => userAccounts.id)
      .notNull()
      .unique(),
    agentCode: varchar('AgentCode', { length: 50 }).notNull().unique(),
    displayName: varchar('DisplayName', { length: 200 }).notNull(),
    status: agentStatusEnum('Status').notNull().default('Active'),
    createdAt: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('UpdatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
    deletedAtUtc: timestamp('DeletedAtUtc', { withTimezone: true }),
  },
  (table) => [index('idx_agentprofiles_userid').on(table.userId)],
);

export const agentProfilesRelations = relations(agentProfiles, ({ many, one }) => ({
  userAccount: one(userAccounts, {
    fields: [agentProfiles.userId],
    references: [userAccounts.id],
  }),
  naps: many(nap),
  apes: many(ape),
  pers: many(per),
  recs: many(rec),
}));
