import { decimal, index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { agentProfiles } from './agent-profiles';

export const apePolicies = pgTable(
  'ApePolicies',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    agentId: uuid('AgentId')
      .references(() => agentProfiles.id)
      .notNull(),
    policyNumber: varchar('PolicyNumber', { length: 100 }).notNull(),
    api: varchar('API', { length: 50 }),
    sumAssured: decimal('SumAssured', { precision: 19, scale: 4 }).notNull(),
    createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_ape_agentid').on(table.agentId),
    index('idx_ape_policynumber').on(table.policyNumber),
  ],
);
