import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { userAccounts } from './user-accounts';

export const notifications = pgTable(
  'Notifications',
  {
    id: uuid('Id').primaryKey().defaultRandom(),
    userId: uuid('UserId').references(() => userAccounts.id),
    channel: varchar('Channel', { length: 30 }).notNull(),
    subject: varchar('Subject', { length: 255 }).notNull(),
    message: text('Message').notNull(),
    status: varchar('Status', { length: 30 }).notNull(),
    metadata: text('Metadata'),
    createdAtUtc: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_notifications_userid').on(table.userId),
    index('idx_notifications_status').on(table.status),
  ],
);
