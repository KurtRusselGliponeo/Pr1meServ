import { relations } from 'drizzle-orm';
import { numeric, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { agentProfiles } from './agent-profiles';

export const per = pgTable('per', {
  id: uuid('Id').primaryKey().defaultRandom(),
  month: timestamp('Month', { withTimezone: true }),
  branch: varchar('Branch', { length: 255 }),
  agentCode: varchar('AgentCode', { length: 50 }).references(() => agentProfiles.agentCode),
  agentName: varchar('AgentName', { length: 255 }),
  agentType: varchar('AgentType', { length: 100 }),
  personalPersistency: numeric('PersonalPersistency', { precision: 10, scale: 4 }),
  unitPersistency: numeric('UnitPersistency', { precision: 10, scale: 4 }),
  branchPersistency: numeric('BranchPersistency', { precision: 10, scale: 4 }),
  createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  updatedAtUtc: timestamp('UpdatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
});

export const perRelations = relations(per, ({ one }) => ({
  agentProfile: one(agentProfiles, {
    fields: [per.agentCode],
    references: [agentProfiles.agentCode],
  }),
}));
