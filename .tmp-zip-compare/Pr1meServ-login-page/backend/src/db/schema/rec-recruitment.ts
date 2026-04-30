import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { agentProfiles } from './agent-profiles';

export const recRecruitment = pgTable(
  'RecRecruitment',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    agentId: uuid('AgentId')
      .references(() => agentProfiles.id)
      .notNull(),
    status: varchar('Status', { length: 50 }).notNull(),
    dateAppointed: timestamp('DateAppointed', { withTimezone: true }).notNull(),
    createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_rec_agentid').on(table.agentId),
    index('idx_rec_status').on(table.status),
  ],
);
