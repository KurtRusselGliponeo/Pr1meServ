import { pgTable, uuid, varchar, timestamp, decimal } from 'drizzle-orm/pg-core';
import { userAccounts } from '../identity/identity.schema';

export const clientProfiles = pgTable('client_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => userAccounts.id).notNull(),
  
  // Taglish: Pangalan ng client na naka-attach sa policy
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  
  // Policy details related to COSAF
  policyNumber: varchar('policy_number', { length: 50 }).notNull().unique(),
  
  // Taglish: Ang premium value na kailangan ipasok ng exact as decimal(19,4) galing sa insurance records
  annualPremium: decimal('annual_premium', { precision: 19, scale: 4 }).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // Taglish: Para sa soft deletes (hindi mawawala sa DB permanently)
  deletedAtUtc: timestamp('deleted_at_utc'),
});
