import type { SystemRole } from '@a1prime/schemas';
import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const userAccounts = pgTable('UserAccounts', {
  id: uuid('Id').primaryKey().defaultRandom(),
  emailHash: varchar('EmailHash', { length: 64 }).notNull().unique(),
  encryptedEmail: text('Email').notNull(),
  passwordHash: varchar('PasswordHash', { length: 255 }).notNull(),
  firstName: varchar('FirstName', { length: 100 }).notNull(),
  lastName: varchar('LastName', { length: 100 }).notNull(),
  role: varchar('SystemRole', { length: 32 }).$type<SystemRole>().notNull(),
  createdAt: timestamp('CreatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('UpdatedAtUtc', { withTimezone: true }).defaultNow().notNull(),
  deletedAtUtc: timestamp('DeletedAtUtc', { withTimezone: true }),
});
