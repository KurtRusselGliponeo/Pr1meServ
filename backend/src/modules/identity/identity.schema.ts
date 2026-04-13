import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';

export const userAccounts = pgTable('user_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Email hashed via SHA-256
  emailHash: varchar('email_hash', { length: 256 }).notNull().unique(),
  // Encrypted actual email via lib/encryption.ts
  encryptedEmail: text('encrypted_email').notNull(),
  // bcryptjs hash
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(), // e.g., Agent, Admin
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // For soft deletes automatically handled globally
  deletedAtUtc: timestamp('deleted_at_utc'),
});
