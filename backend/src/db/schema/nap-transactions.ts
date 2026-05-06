import { index, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { agentProfiles } from './agent-profiles';
import { policies } from './policies';
import { userAccounts } from './user-accounts';

export const napTransactions = pgTable(
  'NapTransactions',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    agentId: uuid('AgentId')
      .references(() => agentProfiles.id)
      .notNull(),
    policyId: uuid('PolicyId').references(() => policies.id),
    policyNumber: varchar('PolicyNumber', { length: 100 }).notNull(),
    accountType: varchar('AccountType', { length: 100 }),
    contractTypeCode: varchar('ContractTypeCode', { length: 50 }),
    typeDesc: varchar('TypeDesc', { length: 255 }),
    transactionDate: timestamp('TransactionDate', { withTimezone: true }).notNull(),
    tempReceiptDate: timestamp('TempReceiptDate', { withTimezone: true }),
    transactionType: varchar('TransactionType', { length: 50 }).notNull(),
    api: varchar('API', { length: 50 }),
    ccCredit: integer('CcCredit'),
    creditStatus: varchar('CreditStatus', { length: 100 }),
    branchCode: varchar('BranchCode', { length: 50 }),
    notes: text('Notes'),
    createdByUserId: uuid('CreatedByUserId').references(() => userAccounts.id),
    updatedByUserId: uuid('UpdatedByUserId').references(() => userAccounts.id),
    createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
    updatedAtUtc: timestamp('UpdatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_nap_agentid').on(table.agentId),
    index('idx_nap_policyid').on(table.policyId),
    index('idx_nap_policynumber').on(table.policyNumber),
    index('idx_nap_transactiontype').on(table.transactionType),
    index('idx_nap_transactiondate').on(table.transactionDate),
  ],
);
