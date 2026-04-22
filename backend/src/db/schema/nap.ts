import { relations } from 'drizzle-orm';
import { integer, numeric, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { agentProfiles } from './agent-profiles';

export const nap = pgTable('nap', {
  id: uuid('Id').primaryKey().defaultRandom(),
  umCode: varchar('UmCode', { length: 50 }),
  umName: varchar('UmName', { length: 255 }),
  agCode: varchar('AgCode', { length: 50 }),
  agName: varchar('AgName', { length: 255 }),
  agentCode: varchar('AgentCode', { length: 50 }).references(() => agentProfiles.agentCode),
  agentName: varchar('AgentName', { length: 255 }),
  policyNumber: varchar('PolicyNumber', { length: 100 }),
  transactionDate: timestamp('TransactionDate', { withTimezone: true }),
  tempReceiptDate: timestamp('TempReceiptDate', { withTimezone: true }),
  processingDays: integer('ProcessingDays'),
  contractTypeCode: varchar('ContractTypeCode', { length: 50 }),
  typeDesc: varchar('TypeDesc', { length: 255 }),
  accountType: varchar('AccountType', { length: 100 }),
  transactionType: varchar('TransactionType', { length: 100 }),
  api: numeric('Api', { precision: 19, scale: 4 }),
  ccCredit: integer('CcCredit'),
  creditStatus: varchar('CreditStatus', { length: 100 }),
  branchName: varchar('BranchName', { length: 255 }),
  suCode: varchar('SuCode', { length: 50 }),
  createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  updatedAtUtc: timestamp('UpdatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
});

export const napRelations = relations(nap, ({ one }) => ({
  agentProfile: one(agentProfiles, {
    fields: [nap.agentCode],
    references: [agentProfiles.agentCode],
  }),
}));
