import { decimal, index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { agentProfiles } from './agent-profiles';
import { userAccounts } from './user-accounts';

export const perPerformance = pgTable(
  'PerPerformance',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    agentId: uuid('AgentId')
      .references(() => agentProfiles.id)
      .notNull(),
    recordMonth: varchar('RecordMonth', { length: 7 }).notNull().default('1970-01'),
    branchCode: varchar('BranchCode', { length: 50 }),
    agentType: varchar('AgentType', { length: 50 }),
    team: varchar('Team', { length: 120 }),
    personalPersistency: decimal('PersonalPersistency', { precision: 5, scale: 2 }).notNull(),
    unitPersistency: decimal('UnitPersistency', { precision: 5, scale: 2 }).default('0.00').notNull(),
    branchPersistency: decimal('BranchPersistency', { precision: 5, scale: 2 }).default('0.00').notNull(),
    notes: text('Notes'),
    createdByUserId: uuid('CreatedByUserId').references(() => userAccounts.id),
    updatedByUserId: uuid('UpdatedByUserId').references(() => userAccounts.id),
    createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
    updatedAtUtc: timestamp('UpdatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_per_agentid').on(table.agentId),
    index('idx_per_recordmonth').on(table.recordMonth),
  ],
);
