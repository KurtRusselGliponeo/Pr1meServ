import { relations } from 'drizzle-orm';
import { integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { agentProfiles } from './agent-profiles';

export const rec = pgTable('rec', {
  id: uuid('Id').primaryKey().defaultRandom(),
  umCode: varchar('UmCode', { length: 50 }),
  umName: varchar('UmName', { length: 255 }),
  recruiter: varchar('Recruiter', { length: 255 }),
  agentCode: varchar('AgentCode', { length: 50 }).references(() => agentProfiles.agentCode),
  agentName: varchar('AgentName', { length: 255 }),
  birthday: timestamp('Birthday', { withTimezone: true }),
  dateAppointed: timestamp('DateAppointed', { withTimezone: true }),
  dateTerminated: timestamp('DateTerminated', { withTimezone: true }),
  tenureDays: integer('TenureDays'),
  status: varchar('Status', { length: 100 }),
  contacts: varchar('Contacts', { length: 255 }),
  createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  updatedAtUtc: timestamp('UpdatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
});

export const recRelations = relations(rec, ({ one }) => ({
  agentProfile: one(agentProfiles, {
    fields: [rec.agentCode],
    references: [agentProfiles.agentCode],
  }),
}));
