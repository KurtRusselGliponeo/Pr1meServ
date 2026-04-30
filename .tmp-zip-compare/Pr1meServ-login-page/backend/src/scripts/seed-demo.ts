import 'dotenv/config';
import { eq, sql } from 'drizzle-orm';

import { db } from '../db/client';
import { agentProfiles, prospects, userAccounts } from '../db/schema';
import { hashPassword } from '../shared/lib/auth';
import { encryptEmail, hashEmail, normalizeEmail } from '../shared/lib/encryption';

type DemoUserSeed = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'Admin' | 'BranchManager' | 'Agent';
  agentCode?: string;
  branchCode?: string;
  displayName?: string;
};

const demoUsers: DemoUserSeed[] = [
  {
    email: 'admin.demo@prulife.com',
    password: 'Admin123!',
    firstName: 'Avery',
    lastName: 'Admin',
    role: 'Admin',
  },
  {
    email: 'bm.demo@prulife.com',
    password: 'BM123456',
    firstName: 'Blair',
    lastName: 'Manager',
    role: 'BranchManager',
    agentCode: 'BM-001',
    branchCode: 'BR-01',
    displayName: 'Blair Manager',
  },
  {
    email: 'agent.demo@prulife.com',
    password: 'AG123456',
    firstName: 'Alex',
    lastName: 'Agent',
    role: 'Agent',
    agentCode: 'AG-001',
    branchCode: 'BR-01',
    displayName: 'Alex Agent',
  },
];

async function upsertDemoUser(seed: DemoUserSeed) {
  const normalizedEmail = normalizeEmail(seed.email);
  const emailHash = hashEmail(normalizedEmail);
  const [existingUser] = await db
    .select({ id: userAccounts.id })
    .from(userAccounts)
    .where(eq(userAccounts.emailHash, emailHash))
    .limit(1);

  const passwordHash = await hashPassword(seed.password);
  const now = new Date();

  if (existingUser) {
    await db
      .update(userAccounts)
      .set({
        encryptedEmail: encryptEmail(normalizedEmail),
        passwordHash,
        firstName: seed.firstName,
        lastName: seed.lastName,
        role: seed.role,
        needsPasswordReset: false,
        deletedAtUtc: null,
        updatedAt: now,
      })
      .where(eq(userAccounts.id, existingUser.id));

    if (seed.agentCode && seed.branchCode && seed.displayName) {
      const [existingAgentProfile] = await db
        .select({ id: agentProfiles.id })
        .from(agentProfiles)
        .where(eq(agentProfiles.userId, existingUser.id))
        .limit(1);

      if (existingAgentProfile) {
        await db
          .update(agentProfiles)
          .set({
            agentCode: seed.agentCode,
            branchCode: seed.branchCode,
            displayName: seed.displayName,
            deletedAtUtc: null,
            updatedAt: now,
          })
          .where(eq(agentProfiles.id, existingAgentProfile.id));
      } else {
        await db.insert(agentProfiles).values({
          userId: existingUser.id,
          agentCode: seed.agentCode,
          branchCode: seed.branchCode,
          displayName: seed.displayName,
          updatedAt: now,
        });
      }
    }

    return existingUser.id;
  }

  const [createdUser] = await db
    .insert(userAccounts)
    .values({
      emailHash,
      encryptedEmail: encryptEmail(normalizedEmail),
      passwordHash,
      firstName: seed.firstName,
      lastName: seed.lastName,
      role: seed.role,
      needsPasswordReset: false,
      updatedAt: now,
    })
    .returning({ id: userAccounts.id });

  if (seed.agentCode && seed.branchCode && seed.displayName) {
    await db.insert(agentProfiles).values({
      userId: createdUser.id,
      agentCode: seed.agentCode,
      branchCode: seed.branchCode,
      displayName: seed.displayName,
      updatedAt: now,
    });
  }

  return createdUser.id;
}

async function seedDemoProspects() {
  const now = Date.now();
  const demoProspects = [
    {
      agentCode: 'AG-001',
      branchCode: 'BR-01',
      clientName: 'Jamie Prospect',
      contactNumber: '09171234567',
      email: 'jamie.prospect@example.com',
      temperature: 'Warm' as const,
      pipelineStage: 'Presentation' as const,
      notes: 'Requested a quick callback after lunch.',
      followUpDateUtc: new Date(now + 2 * 60 * 60 * 1000),
    },
    {
      agentCode: 'AG-001',
      branchCode: 'BR-01',
      clientName: 'Morgan Lead',
      contactNumber: '09179876543',
      email: 'morgan.lead@example.com',
      temperature: 'Cold' as const,
      pipelineStage: 'Contacted' as const,
      notes: 'Needs a product comparison follow-up.',
      followUpDateUtc: new Date(now - 60 * 60 * 1000),
    },
  ];

  for (const seed of demoProspects) {
    const [existingProspect] = await db
      .select({ id: prospects.id })
      .from(prospects)
      .where(eq(prospects.clientName, seed.clientName))
      .limit(1);

    if (existingProspect) {
      await db
        .update(prospects)
        .set({
          ...seed,
          updatedAt: new Date(),
        })
        .where(eq(prospects.id, existingProspect.id));
      continue;
    }

    await db.insert(prospects).values({
      ...seed,
      lastContactedAtUtc: seed.pipelineStage === 'Contacted' ? new Date() : null,
      updatedAt: new Date(),
    });
  }
}

async function seedDemo() {
  await db.execute(sql`ALTER TABLE "AgentProfiles" ADD COLUMN IF NOT EXISTS "BranchCode" varchar(50) NOT NULL DEFAULT 'UNASSIGNED'`);
  await db.execute(sql`ALTER TABLE "AgentProfiles" ADD COLUMN IF NOT EXISTS "ProfileImageKey" varchar(255)`);
  await db.execute(sql`DO $$ BEGIN
    CREATE TYPE "agent_status" AS ENUM ('Active', 'Terminated');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`);
  await db.execute(sql`ALTER TABLE "AgentProfiles" ADD COLUMN IF NOT EXISTS "Status" "agent_status" NOT NULL DEFAULT 'Active'`);

  for (const seed of demoUsers) {
    await upsertDemoUser(seed);
  }

  await seedDemoProspects();

  console.log('Demo users and prospects seeded.');
  console.log('Admin: admin.demo@prulife.com / Admin123!');
  console.log('BranchManager: bm.demo@prulife.com / BM123456');
  console.log('Agent: agent.demo@prulife.com / AG123456');
}

seedDemo()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
