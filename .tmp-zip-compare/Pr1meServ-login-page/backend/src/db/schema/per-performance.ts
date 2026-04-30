import { decimal, index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { agentProfiles } from './agent-profiles';

export const perPerformance = pgTable(
  'PerPerformance',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    agentId: uuid('AgentId')
      .references(() => agentProfiles.id)
      .notNull(),
    personalPersistency: decimal('PersonalPersistency', { precision: 5, scale: 2 }).notNull(),
    createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_per_agentid').on(table.agentId),
  ],
);
