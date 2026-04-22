import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { agentProfiles } from './agent-profiles';

export const napTransactions = pgTable(
  'NapTransactions',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    agentId: uuid('AgentId')
      .references(() => agentProfiles.id)
      .notNull(),
    policyNumber: varchar('PolicyNumber', { length: 100 }).notNull(),
    transactionDate: timestamp('TransactionDate', { withTimezone: true }).notNull(),
    transactionType: varchar('TransactionType', { length: 50 }).notNull(),
    api: varchar('API', { length: 50 }),
    createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_nap_agentid').on(table.agentId),
    index('idx_nap_policynumber').on(table.policyNumber),
    index('idx_nap_transactiontype').on(table.transactionType),
  ],
);
