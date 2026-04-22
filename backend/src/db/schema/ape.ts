import { relations } from 'drizzle-orm';
import { numeric, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { agentProfiles } from './agent-profiles';

export const ape = pgTable('ape', {
  id: uuid('Id').primaryKey().defaultRandom(),
  umCode: varchar('UmCode', { length: 50 }),
  umName: varchar('UmName', { length: 255 }),
  agCode: varchar('AgCode', { length: 50 }),
  agName: varchar('AgName', { length: 255 }),
  agentCode: varchar('AgentCode', { length: 50 }).references(() => agentProfiles.agentCode),
  policyNumber: varchar('PolicyNumber', { length: 100 }),
  planCode: varchar('PlanCode', { length: 50 }),
  firstIssueDate: timestamp('FirstIssueDate', { withTimezone: true }),
  mode: varchar('Mode', { length: 50 }),
  modalPremium: numeric('ModalPremium', { precision: 19, scale: 4 }),
  premiumBand: varchar('PremiumBand', { length: 100 }),
  sumAssured: numeric('SumAssured', { precision: 19, scale: 4 }),
  api: numeric('Api', { precision: 19, scale: 4 }),
  currency: varchar('Currency', { length: 20 }),
  createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  updatedAtUtc: timestamp('UpdatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
});

export const apeRelations = relations(ape, ({ one }) => ({
  agentProfile: one(agentProfiles, {
    fields: [ape.agentCode],
    references: [agentProfiles.agentCode],
  }),
}));
