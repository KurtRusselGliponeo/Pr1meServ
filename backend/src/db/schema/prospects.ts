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
    branchCode: varchar('BranchCode', { length: 50 }).notNull().default('UNASSIGNED'),
    clientName: varchar('ClientName', { length: 200 }).notNull(),
    contactNumber: varchar('ContactNumber', { length: 50 }).notNull(),
    email: varchar('Email', { length: 255 }),
    temperature: prospectTemperatureEnum('Temperature').notNull(),
    pipelineStage: prospectPipelineStageEnum('PipelineStage').notNull().default('Contacted'),
    notes: varchar('Notes', { length: 4000 }),
    followUpDateUtc: timestamp('FollowUpDateUtc', { withTimezone: true }),
    lastContactedAtUtc: timestamp('LastContactedAtUtc', { withTimezone: true }),
    createdAt: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('UpdatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_prospects_agent_code').on(table.agentCode),
    index('idx_prospects_branch_code').on(table.branchCode),
    index('idx_prospects_stage').on(table.pipelineStage),
    index('idx_prospects_followup').on(table.followUpDateUtc),
  ],
);
