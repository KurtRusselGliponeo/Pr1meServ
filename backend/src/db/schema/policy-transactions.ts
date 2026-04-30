import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { policies } from './policies';

export const policyTransactions = pgTable(
  'PolicyTransactions',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    policyId: uuid('PolicyId')
      .references(() => policies.id)
      .notNull(),
    sourceType: varchar('SourceType', { length: 20 }).notNull(),
    sourceRecordId: uuid('SourceRecordId'),
    transactionType: varchar('TransactionType', { length: 100 }).notNull(),
    transactionStatus: varchar('TransactionStatus', { length: 100 }),
    effectiveAtUtc: timestamp('EffectiveAtUtc', { withTimezone: true }),
    payload: text('Payload'),
    createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_policytransactions_policyid').on(table.policyId),
    index('idx_policytransactions_sourcetype').on(table.sourceType),
  ],
);
