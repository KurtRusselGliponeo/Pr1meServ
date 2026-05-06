import type { PolicyStatus } from '@a1prime/schemas';
import { date, decimal, index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { agentProfiles } from './agent-profiles';
import { clientProfiles } from './client-profiles';
import { planCodes } from './plan-codes';
import { userAccounts } from './user-accounts';

export const policies = pgTable(
  'Policies',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    clientProfileId: uuid('ClientProfileId')
      .references(() => clientProfiles.id)
      .notNull(),
    assignedAgentId: uuid('AssignedAgentId').references(() => agentProfiles.id),
    policyNumber: varchar('PolicyNumber', { length: 50 }).notNull().unique(),
    branchCode: varchar('BranchCode', { length: 50 }).notNull(),
    policyOwnerName: varchar('PolicyOwnerName', { length: 255 }),
    lifeInsuredName: varchar('LifeInsuredName', { length: 255 }),
    productType: varchar('ProductType', { length: 120 }),
    planCode: varchar('PlanCode', { length: 50 }).references(() => planCodes.planCode),
    planName: varchar('PlanName', { length: 255 }),
    currency: varchar('Currency', { length: 20 }).default('PHP').notNull(),
    firstIssueDate: date('FirstIssueDate'),
    mode: varchar('Mode', { length: 50 }),
    modalPremium: decimal('ModalPremium', { precision: 19, scale: 4 }).default('0.0000').notNull(),
    sumAssured: decimal('SumAssured', { precision: 19, scale: 4 }).default('0.0000').notNull(),
    api: decimal('Api', { precision: 19, scale: 4 }).default('0.0000').notNull(),
    policyStatus: varchar('PolicyStatus', { length: 32 }).$type<PolicyStatus>().default('Active').notNull(),
    notes: text('Notes'),
    createdByUserId: uuid('CreatedByUserId').references(() => userAccounts.id),
    updatedByUserId: uuid('UpdatedByUserId').references(() => userAccounts.id),
    createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
    updatedAtUtc: timestamp('UpdatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_policies_clientprofileid').on(table.clientProfileId),
    index('idx_policies_agentid').on(table.assignedAgentId),
    index('idx_policies_branchcode').on(table.branchCode),
    index('idx_policies_plancode').on(table.planCode),
    index('idx_policies_firstissuedate').on(table.firstIssueDate),
    index('idx_policies_status').on(table.policyStatus),
  ],
);
