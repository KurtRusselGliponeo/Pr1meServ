import { index, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const prospectTemperatureEnum = pgEnum('ProspectTemperature', ['Warm', 'Cold']);
export const prospectPipelineStageEnum = pgEnum('ProspectPipelineStage', [
  'Contacted',
  'Client Agreed',
  'Presentation',
  'Approved',
  'Closed',
]);

export const prospects = pgTable(
  'Prospects',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    agentCode: varchar('AgentCode', { length: 50 }).notNull(),
    clientName: varchar('ClientName', { length: 200 }).notNull(),
    contactNumber: varchar('ContactNumber', { length: 50 }).notNull(),
    temperature: prospectTemperatureEnum('Temperature').notNull(),
    pipelineStage: prospectPipelineStageEnum('PipelineStage').notNull().default('Contacted'),
    createdAt: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('UpdatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_prospects_agent_code').on(table.agentCode),
    index('idx_prospects_stage').on(table.pipelineStage),
  ],
);
