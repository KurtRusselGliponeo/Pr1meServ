import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { agentProfiles } from './agent-profiles';
import { clientProfiles } from './client-profiles';
import { userAccounts } from './user-accounts';

export const clientAssignmentHistory = pgTable(
  'ClientAssignmentHistory',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    clientProfileId: uuid('ClientProfileId')
      .references(() => clientProfiles.id)
      .notNull(),
    fromAgentId: uuid('FromAgentId').references(() => agentProfiles.id),
    toAgentId: uuid('ToAgentId').references(() => agentProfiles.id),
    actorUserId: uuid('ActorUserId').references(() => userAccounts.id),
    branchCode: varchar('BranchCode', { length: 50 }).notNull(),
    reason: text('Reason'),
    createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_clientassignmenthistory_client').on(table.clientProfileId),
    index('idx_clientassignmenthistory_actor').on(table.actorUserId),
    index('idx_clientassignmenthistory_branch').on(table.branchCode),
  ],
);
