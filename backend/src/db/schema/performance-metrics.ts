import { decimal, index, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { agentProfiles } from './agent-profiles';

export const performanceMetrics = pgTable(
  'PerformanceMetrics',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    agentId: uuid('AgentId')
      .references(() => agentProfiles.id)
      .notNull(),
    recordMonth: varchar('RecordMonth', { length: 7 }).notNull(),
    modalPremium: decimal('ModalPremium', { precision: 19, scale: 4 }).notNull(),
    api: decimal('Api', { precision: 19, scale: 4 }).notNull(),
    sumAssured: decimal('SumAssured', { precision: 19, scale: 4 }).notNull(),
    commissionAmount: decimal('CommissionAmount', { precision: 19, scale: 4 }).notNull(),
    recruitmentCount: integer('RecruitmentCount').default(0).notNull(),
    ytdSurplus: decimal('YtdSurplus', { precision: 19, scale: 4 }).default('0.0000').notNull(),
    createdAt: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('UpdatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_perfmetrics_agentid').on(table.agentId),
    index('idx_perfmetrics_recordmonth').on(table.recordMonth),
  ],
);
