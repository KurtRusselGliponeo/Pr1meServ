import { date, index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { agentProfiles } from './agent-profiles';
import { userAccounts } from './user-accounts';

export const recRecruitment = pgTable(
  'RecRecruitment',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    agentId: uuid('AgentId')
      .references(() => agentProfiles.id)
      .notNull(),
    agentCode: varchar('AgentCode', { length: 50 }),
    agentName: varchar('AgentName', { length: 255 }),
    recruiter: varchar('Recruiter', { length: 255 }),
    umCode: varchar('UmCode', { length: 50 }),
    umName: varchar('UmName', { length: 255 }),
    bmCode: varchar('BmCode', { length: 50 }),
    bmName: varchar('BmName', { length: 255 }),
    team: varchar('Team', { length: 120 }),
    birthday: date('Birthday'),
    status: varchar('Status', { length: 50 }).notNull(),
    dateAppointed: timestamp('DateAppointed', { withTimezone: true }).notNull(),
    dateTerminated: timestamp('DateTerminated', { withTimezone: true }),
    contacts: varchar('Contacts', { length: 255 }),
    notes: text('Notes'),
    createdByUserId: uuid('CreatedByUserId').references(() => userAccounts.id),
    updatedByUserId: uuid('UpdatedByUserId').references(() => userAccounts.id),
    createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
    updatedAtUtc: timestamp('UpdatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_rec_agentid').on(table.agentId),
    index('idx_rec_agentcode').on(table.agentCode),
    index('idx_rec_status').on(table.status),
    index('idx_rec_dateappointed').on(table.dateAppointed),
  ],
);
