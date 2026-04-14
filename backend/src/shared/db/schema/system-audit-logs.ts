import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { userAccounts } from './user-accounts';

export const systemAuditLogs = pgTable('SystemAuditLogs', {
  id: uuid('Id').primaryKey().defaultRandom(),
  actorUserId: uuid('ActorUserId').references(() => userAccounts.id),
  action: text('Action').notNull(),
  entityName: text('EntityName').notNull(),
  entityId: uuid('EntityId'),
  oldValue: jsonb('OldValue').$type<Record<string, unknown> | null>(),
  newValue: jsonb('NewValue').$type<Record<string, unknown> | null>(),
  createdAt: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
});
