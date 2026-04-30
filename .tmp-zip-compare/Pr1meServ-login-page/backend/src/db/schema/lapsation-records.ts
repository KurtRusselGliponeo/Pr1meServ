import { boolean, index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { clientProfiles } from './client-profiles';

export const lapsationRecords = pgTable(
  'LapsationRecords',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    policyNumberId: uuid('PolicyNumberId')
      .references(() => clientProfiles.id)
      .notNull(),
    isAtRisk: boolean('IsAtRisk').default(true).notNull(),
    reinstatedAtUtc: timestamp('ReinstatedAtUtc', { withTimezone: true }),
    lapseDateUtc: timestamp('LapseDateUtc', { withTimezone: true }).notNull(),
    createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_lapsation_policynumber').on(table.policyNumberId)],
);
