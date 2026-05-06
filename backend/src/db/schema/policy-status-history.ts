import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import type { PolicyStatus } from '@a1prime/schemas';
import { policies } from './policies';
import { userAccounts } from './user-accounts';

export const policyStatusHistory = pgTable(
  'PolicyStatusHistory',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    policyId: uuid('PolicyId')
      .references(() => policies.id)
      .notNull(),
    changedByUserId: uuid('ChangedByUserId').references(() => userAccounts.id),
    previousStatus: varchar('PreviousStatus', { length: 32 }).$type<PolicyStatus | null>(),
    nextStatus: varchar('NextStatus', { length: 32 }).$type<PolicyStatus>().notNull(),
    effectiveAtUtc: timestamp('EffectiveAtUtc', { withTimezone: true }).notNull(),
    reason: varchar('Reason', { length: 255 }),
    notes: text('Notes'),
    metadata: jsonb('Metadata').$type<Record<string, unknown> | null>(),
    createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_policystatushistory_policyid').on(table.policyId),
    index('idx_policystatushistory_nextstatus').on(table.nextStatus),
    index('idx_policystatushistory_effectiveat').on(table.effectiveAtUtc),
  ],
);
