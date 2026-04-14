import type { CaseStatus, PolicyStatus } from '@a1prime/schemas';
import { decimal, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { agentProfiles } from './agent-profiles';

export const clientProfiles = pgTable('ClientProfiles', {
  id: uuid('Id').primaryKey().defaultRandom(),
  assignedAgentId: uuid('AssignedAgentId')
    .references(() => agentProfiles.id)
    .notNull(),
  firstName: varchar('FirstName', { length: 100 }).notNull(),
  lastName: varchar('LastName', { length: 100 }).notNull(),
  policyNumber: varchar('PolicyNumber', { length: 50 }).notNull().unique(),
  modalPremium: decimal('ModalPremium', { precision: 19, scale: 4 }).notNull(),
  api: decimal('Api', { precision: 19, scale: 4 }).notNull(),
  sumAssured: decimal('SumAssured', { precision: 19, scale: 4 }).notNull(),
  commissionAmount: decimal('CommissionAmount', { precision: 19, scale: 4 }).notNull(),
  caseStatus: varchar('CaseStatus', { length: 32 }).$type<CaseStatus>().notNull(),
  policyStatus: varchar('PolicyStatus', { length: 32 }).$type<PolicyStatus>().notNull(),
  createdAt: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('UpdatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  deletedAtUtc: timestamp('DeletedAtUtc', { withTimezone: true }),
});
