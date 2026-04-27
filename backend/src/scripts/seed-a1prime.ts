import 'dotenv/config';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

import { db } from '../db/client';
import {
  agentProfiles,
  clientProfiles,
  cosafApprovals,
  lapsationRecords,
  notifications,
  performanceMetrics,
  prospects,
  userAccounts,
  nap,
  ape,
  per,
  rec,
  perPerformance,
  napTransactions,
  recRecruitment,
} from '../db/schema';
import { encryptEmail, hashEmail, normalizeEmail } from '../shared/lib/encryption';

// ─── Constants ────────────────────────────────────────────────────────────────
const BRANCH_CODE = '70005646';
const BRANCH_NAME = 'A1 Prime Branch';
const DEFAULT_PASSWORD = 'A1Prime2024!';

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

function makeEmail(firstName: string, lastName: string): string {
  const f = firstName.toLowerCase().replace(/\s/g, '');
  const l = lastName.toLowerCase().replace(/\s/g, '');
  return `pluk${f}.${l}@gmail.com`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

function recordMonth(offsetMonths = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() - offsetMonths);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── People data ──────────────────────────────────────────────────────────────
const BM = {
  firstName: 'Maria',
  lastName: 'Santos',
  email: 'plukma.santos@gmail.com',
  role: 'BranchManager' as const,
};

const AGENTS = [
  { firstName: 'Juan',     lastName: 'Dela Cruz',  agentCode: '70005001', policyBase: 20000000 },
  { firstName: 'Ana',      lastName: 'Reyes',       agentCode: '70005002', policyBase: 20000100 },
  { firstName: 'Carlo',    lastName: 'Mendoza',     agentCode: '70005003', policyBase: 20000200 },
  { firstName: 'Liza',     lastName: 'Garcia',      agentCode: '70005004', policyBase: 20000300 },
  { firstName: 'Ramon',    lastName: 'Villanueva',  agentCode: '70005005', policyBase: 20000400 },
];

// Product types used across clients
const PRODUCTS = [
  'PRULife Your Term',
  'PRUMax Life',
  'PRUShield',
  'PRULink Assurance',
  'PRUHealth Active',
];

const PLAN_CODES = ['PLT', 'PML', 'PSH', 'PLA', 'PHA'];

// ─── Main seeder ─────────────────────────────────────────────────────────────
async function seed() {
  console.log('🌱 Starting A1 Prime seed...\n');

  // 1. Upsert Branch Manager ─────────────────────────────────────────────────
  const bmEmail = normalizeEmail(BM.email);
  const bmHash  = hashEmail(bmEmail);
  let bmUserId: string;

  const [existingBm] = await db.select({ id: userAccounts.id }).from(userAccounts)
    .where(eq(userAccounts.emailHash, bmHash)).limit(1);

  if (existingBm) {
    bmUserId = existingBm.id;
    await db.update(userAccounts).set({
      encryptedEmail: encryptEmail(bmEmail),
      passwordHash: await hashPassword(DEFAULT_PASSWORD),
      firstName: BM.firstName, lastName: BM.lastName,
      role: BM.role, needsPasswordReset: false, updatedAt: new Date(),
    }).where(eq(userAccounts.id, bmUserId));
    console.log(`  ↩  BM refreshed: ${BM.email}`);
  } else {
    const [created] = await db.insert(userAccounts).values({
      emailHash: bmHash, encryptedEmail: encryptEmail(bmEmail),
      passwordHash: await hashPassword(DEFAULT_PASSWORD),
      firstName: BM.firstName, lastName: BM.lastName,
      role: BM.role, needsPasswordReset: false, updatedAt: new Date(),
    }).returning({ id: userAccounts.id });
    bmUserId = created.id;
    console.log(`  ✓  BM created: ${BM.email}`);
  }

  // 2. Upsert Agents ─────────────────────────────────────────────────────────
  const agentProfileIds: Record<string, string> = {}; // agentCode → agentProfile.id

  for (const ag of AGENTS) {
    const email  = normalizeEmail(makeEmail(ag.firstName, ag.lastName));
    const ehash  = hashEmail(email);
    const dName  = `${ag.firstName} ${ag.lastName}`;
    let userId: string;

    const [existingUser] = await db.select({ id: userAccounts.id }).from(userAccounts)
      .where(eq(userAccounts.emailHash, ehash)).limit(1);

    if (existingUser) {
      userId = existingUser.id;
      await db.update(userAccounts).set({
        encryptedEmail: encryptEmail(email),
        passwordHash: await hashPassword(DEFAULT_PASSWORD),
        firstName: ag.firstName, lastName: ag.lastName,
        role: 'Agent', needsPasswordReset: false, updatedAt: new Date(),
      }).where(eq(userAccounts.id, userId));
    } else {
      const [created] = await db.insert(userAccounts).values({
        emailHash: ehash, encryptedEmail: encryptEmail(email),
        passwordHash: await hashPassword(DEFAULT_PASSWORD),
        firstName: ag.firstName, lastName: ag.lastName,
        role: 'Agent', needsPasswordReset: false, updatedAt: new Date(),
      }).returning({ id: userAccounts.id });
      userId = created.id;
    }

    // Agent profile
    const [existingAP] = await db.select({ id: agentProfiles.id }).from(agentProfiles)
      .where(eq(agentProfiles.agentCode, ag.agentCode)).limit(1);

    let apId: string;
    if (existingAP) {
      apId = existingAP.id;
      await db.update(agentProfiles).set({
        branchCode: BRANCH_CODE, displayName: dName,
        status: 'Active', deletedAtUtc: null, updatedAt: new Date(),
      }).where(eq(agentProfiles.id, apId));
    } else {
      const [createdAP] = await db.insert(agentProfiles).values({
        userId, agentCode: ag.agentCode, branchCode: BRANCH_CODE,
        displayName: dName, status: 'Active', updatedAt: new Date(),
      }).returning({ id: agentProfiles.id });
      apId = createdAP.id;
    }

    agentProfileIds[ag.agentCode] = apId;
    console.log(`  ✓  Agent: ${dName} (${ag.agentCode}) → ${email}`);
  }

  // 3. Client Profiles (8 per agent = 40 total) ──────────────────────────────
  console.log('\n  Seeding client profiles...');
  const clientStatuses: Array<'Uncontacted' | 'Contacted' | 'Forms Submitted' | 'BM Signed' | 'Done' | 'Returned' | 'Orphan'> =
    ['Uncontacted', 'Contacted', 'Forms Submitted', 'BM Signed', 'Done', 'Contacted', 'Returned', 'Uncontacted'];
  const policyStatuses: Array<'Active' | 'Lapsed' | 'Cancelled' | 'Matured'> =
    ['Active', 'Active', 'Active', 'Active', 'Active', 'Lapsed', 'Active', 'Active'];

  // Store created client IDs for COSAF / lapsation
  const lapsedClientIds: string[] = [];
  const activeClientIds: string[] = [];

  for (let ai = 0; ai < AGENTS.length; ai++) {
    const ag  = AGENTS[ai];
    const apId = agentProfileIds[ag.agentCode];

    for (let ci = 0; ci < 8; ci++) {
      const polNum = String(ag.policyBase + ci);
      const prodIdx = (ai + ci) % PRODUCTS.length;
      const caseStatus = clientStatuses[ci];
      const policyStatus = policyStatuses[ci];
      const modal = 3000 + (ci * 500) + (ai * 200);

      const [existing] = await db.select({ id: clientProfiles.id }).from(clientProfiles)
        .where(eq(clientProfiles.policyNumber, polNum)).limit(1);

      let clientId: string;
      if (existing) {
        clientId = existing.id;
        await db.update(clientProfiles).set({
          assignedAgentId: apId,
          branchCode: BRANCH_CODE,
          productType: PRODUCTS[prodIdx],
          planCode: PLAN_CODES[prodIdx],
          caseStatus,
          policyStatus,
          updatedAt: new Date(),
        }).where(eq(clientProfiles.id, clientId));
      } else {
        const [created] = await db.insert(clientProfiles).values({
          assignedAgentId: apId,
          firstName: `Client${ai * 8 + ci + 1}`,
          lastName: 'TestUser',
          policyNumber: polNum,
          branchCode: BRANCH_CODE,
          productType: PRODUCTS[prodIdx],
          planCode: PLAN_CODES[prodIdx],
          modalPremium: String(modal),
          api: String(modal * 12),
          sumAssured: String(modal * 100),
          commissionAmount: String(modal * 0.3),
          caseStatus,
          policyStatus,
          updatedAt: new Date(),
        }).returning({ id: clientProfiles.id });
        clientId = created.id;
      }

      if (policyStatus === 'Lapsed') lapsedClientIds.push(clientId);
      else activeClientIds.push(clientId);
    }
  }
  console.log(`  ✓  40 client profiles seeded.`);

  // 4. NAP records (raw report rows, 3 per agent) ────────────────────────────
  console.log('\n  Seeding NAP records...');
  for (const ag of AGENTS) {
    for (let i = 0; i < 3; i++) {
      const polNum = String(ag.policyBase + i);
      const api = (5000 + i * 1200 + AGENTS.indexOf(ag) * 800).toFixed(4);
      const [existing] = await db.select({ id: nap.id }).from(nap)
        .where(eq(nap.policyNumber, polNum)).limit(1);
      if (!existing) {
        await db.insert(nap).values({
          umCode: '70001001', umName: 'Unit Manager A',
          agCode: '70002001', agName: 'Agent Group 1',
          agentCode: ag.agentCode, agentName: `${ag.firstName} ${ag.lastName}`,
          policyNumber: polNum,
          transactionDate: daysAgo(15 - i * 5),
          tempReceiptDate: daysAgo(14 - i * 5),
          processingDays: 1,
          contractTypeCode: PLAN_CODES[i % PLAN_CODES.length],
          typeDesc: PRODUCTS[i % PRODUCTS.length],
          accountType: 'Individual', transactionType: 'New',
          api, ccCredit: 1, creditStatus: 'Credited',
          branchName: BRANCH_NAME, suCode: `SU-${AGENTS.indexOf(ag) + 1}`,
          updatedAtUtc: new Date(),
        });
      }
    }
  }
  console.log('  ✓  NAP records seeded.');

  // 5. APE records (in-force book, 4 per agent) ──────────────────────────────
  console.log('\n  Seeding APE records...');
  for (const ag of AGENTS) {
    for (let i = 0; i < 4; i++) {
      const polNum = String(ag.policyBase + i);
      const modal = (3000 + i * 500).toFixed(4);
      const apiVal = (Number(modal) * 12).toFixed(4);
      const [existing] = await db.select({ id: ape.id }).from(ape)
        .where(eq(ape.policyNumber, polNum)).limit(1);
      if (!existing) {
        await db.insert(ape).values({
          umCode: '70001001', umName: 'Unit Manager A',
          agCode: '70002001', agName: 'Agent Group 1',
          agentCode: ag.agentCode,
          policyNumber: polNum,
          planCode: PLAN_CODES[i % PLAN_CODES.length],
          firstIssueDate: monthsAgo(6 + i),
          mode: i % 2 === 0 ? 'Monthly' : 'Annual',
          modalPremium: modal, premiumBand: 'Mid',
          sumAssured: String(Number(modal) * 100),
          api: apiVal, currency: 'PHP',
          updatedAtUtc: new Date(),
        });
      }
    }
  }
  console.log('  ✓  APE records seeded.');

  // 6. PER records (persistency, 1 per agent current month) ─────────────────
  console.log('\n  Seeding PER records...');
  const persistencyValues = [85.32, 78.91, 92.14, 88.67, 73.45];
  const unitPer = 83.90;
  const branchPer = 83.70;

  for (let i = 0; i < AGENTS.length; i++) {
    const ag = AGENTS[i];
    const [existing] = await db.select({ id: per.id }).from(per)
      .where(eq(per.agentCode, ag.agentCode)).limit(1);
    if (!existing) {
      await db.insert(per).values({
        month: new Date(),
        branch: BRANCH_NAME,
        agentCode: ag.agentCode,
        agentName: `${ag.firstName} ${ag.lastName}`,
        agentType: 'FNA',
        personalPersistency: String(persistencyValues[i]),
        unitPersistency: String(unitPer),
        branchPersistency: String(branchPer),
        updatedAtUtc: new Date(),
      });
    }
  }
  console.log('  ✓  PER records seeded.');

  // 7. REC records (1-2 recruits per agent) ─────────────────────────────────
  console.log('\n  Seeding REC records...');
  const recruitNames = [
    ['Jose Bautista', '09171110001'], ['Maria Clara', '09182220002'],
    ['Pedro Penduko', '09193330003'], ['Nena Santos', '09204440004'],
    ['Luis Alvarez', '09215550005'], ['Rosa Magsaysay', '09226660006'],
    ['Felix Manalo', '09237770007'],
  ];
  let rIdx = 0;
  for (const ag of AGENTS) {
    const count = ag.agentCode === '70005001' ? 2 : 1;
    for (let c = 0; c < count; c++) {
      const [rName, rContact] = recruitNames[rIdx++ % recruitNames.length];
      await db.insert(rec).values({
        umCode: '70001001', umName: 'Unit Manager A',
        recruiter: `${ag.firstName} ${ag.lastName}`,
        agentCode: ag.agentCode,
        agentName: rName,
        birthday: new Date('1990-06-15'),
        dateAppointed: daysAgo(90 + c * 30),
        tenureDays: 90 + c * 30,
        status: 'Active',
        contacts: rContact,
        updatedAtUtc: new Date(),
      }).onConflictDoNothing();
    }
  }
  console.log('  ✓  REC records seeded.');

  // 8. PerformanceMetrics summary (3 months per agent) ─────────────────────
  console.log('\n  Seeding PerformanceMetrics...');
  for (let mi = 0; mi < 3; mi++) {
    for (let i = 0; i < AGENTS.length; i++) {
      const ag  = AGENTS[i];
      const apId = agentProfileIds[ag.agentCode];
      const rm   = recordMonth(mi);
      const [existing] = await db.select({ id: performanceMetrics.id })
        .from(performanceMetrics)
        .where(eq(performanceMetrics.agentId, apId))
        .limit(1);
      if (!existing) {
        await db.insert(performanceMetrics).values({
          agentId: apId,
          recordMonth: rm,
          modalPremium: String(18000 + i * 2000 - mi * 1500),
          api: String(216000 + i * 24000 - mi * 18000),
          sumAssured: String(1800000 + i * 200000),
          commissionAmount: String(5400 + i * 600),
          recruitmentCount: i === 0 ? 2 : 1,
          ytdSurplus: String(12000 + i * 3000 - mi * 2000),
          updatedAt: new Date(),
        });
      }
    }
  }
  console.log('  ✓  PerformanceMetrics seeded (3 months each agent).');

  // 9. PerPerformance (persistency snapshot) ────────────────────────────────
  for (let i = 0; i < AGENTS.length; i++) {
    const apId = agentProfileIds[AGENTS[i].agentCode];
    await db.insert(perPerformance).values({
      agentId: apId,
      personalPersistency: String(persistencyValues[i]),
      createdAtUtc: new Date(),
    }).onConflictDoNothing();
  }

  // 10. NapTransactions (bridging table) ────────────────────────────────────
  for (const ag of AGENTS) {
    const apId = agentProfileIds[ag.agentCode];
    for (let i = 0; i < 3; i++) {
      await db.insert(napTransactions).values({
        agentId: apId,
        policyNumber: String(ag.policyBase + i),
        transactionDate: daysAgo(15 - i * 5),
        transactionType: 'New',
        api: String(5000 + i * 1200),
        createdAtUtc: new Date(),
      }).onConflictDoNothing();
    }
  }

  // 11. RecRecruitment (bridging table) ─────────────────────────────────────
  for (let i = 0; i < AGENTS.length; i++) {
    const apId = agentProfileIds[AGENTS[i].agentCode];
    await db.insert(recRecruitment).values({
      agentId: apId,
      status: 'Active',
      dateAppointed: daysAgo(90 + i * 10),
      createdAtUtc: new Date(),
    }).onConflictDoNothing();
  }
  console.log('  ✓  NapTransactions + RecRecruitment seeded.');

  // 12. Lapsation Records ────────────────────────────────────────────────────
  console.log('\n  Seeding lapsation records...');
  for (const cid of lapsedClientIds) {
    const [existing] = await db.select({ id: lapsationRecords.id }).from(lapsationRecords)
      .where(eq(lapsationRecords.policyNumberId, cid)).limit(1);
    if (!existing) {
      await db.insert(lapsationRecords).values({
        policyNumberId: cid,
        isAtRisk: true,
        lapseDateUtc: daysAgo(30),
        createdAtUtc: new Date(),
      });
    }
  }
  // A couple of active policies flagged as at-risk (near lapse)
  for (const cid of activeClientIds.slice(0, 3)) {
    const [existing] = await db.select({ id: lapsationRecords.id }).from(lapsationRecords)
      .where(eq(lapsationRecords.policyNumberId, cid)).limit(1);
    if (!existing) {
      await db.insert(lapsationRecords).values({
        policyNumberId: cid,
        isAtRisk: true,
        lapseDateUtc: daysAgo(-14), // lapses in 14 days
        createdAtUtc: new Date(),
      });
    }
  }
  console.log('  ✓  Lapsation records seeded.');

  // 13. COSAF Approvals ─────────────────────────────────────────────────────
  console.log('\n  Seeding COSAF approvals...');
  const cosafCases: Array<{ clientIdx: number; status: string; reason: string | null }> = [
    { clientIdx: 0, status: 'PENDING',  reason: null },
    { clientIdx: 1, status: 'PENDING',  reason: null },
    { clientIdx: 2, status: 'APPROVED', reason: 'Agent resigned. Client reassigned per BM directive.' },
    { clientIdx: 3, status: 'REJECTED', reason: 'Insufficient justification provided for reassignment.' },
  ];
  for (const c of cosafCases) {
    const clientId = activeClientIds[c.clientIdx];
    if (!clientId) continue;
    const [existing] = await db.select({ id: cosafApprovals.id }).from(cosafApprovals)
      .where(eq(cosafApprovals.clientProfileId, clientId)).limit(1);
    if (!existing) {
      await db.insert(cosafApprovals).values({
        clientProfileId: clientId,
        reviewingBmId: bmUserId,
        status: c.status,
        reason: c.reason,
        createdAtUtc: new Date(),
      });
    }
  }
  console.log('  ✓  COSAF approvals seeded (2 pending, 1 approved, 1 rejected).');

  // 14. Notifications ───────────────────────────────────────────────────────
  console.log('\n  Seeding notifications...');
  const agUserIds: string[] = [];
  for (const ag of AGENTS) {
    const email = normalizeEmail(makeEmail(ag.firstName, ag.lastName));
    const [row] = await db.select({ id: userAccounts.id }).from(userAccounts)
      .where(eq(userAccounts.emailHash, hashEmail(email))).limit(1);
    if (row) agUserIds.push(row.id);
  }

  const notifSeeds = [
    { userId: agUserIds[0], subject: 'New Client Assigned', message: 'Policy 20000000 has been assigned to you. Please review and initiate contact.', status: 'delivered' },
    { userId: agUserIds[1], subject: 'Lapsation Alert',     message: 'Policy 20000106 is at risk of lapsing in 14 days. Please follow up with the client immediately.', status: 'delivered' },
    { userId: agUserIds[2], subject: 'New Client Assigned', message: 'Policy 20000200 has been assigned to you after agent resignation.', status: 'delivered' },
    { userId: bmUserId,     subject: 'COSAF Pending Review', message: '2 reassignment requests are pending your approval.', status: 'delivered' },
    { userId: agUserIds[3], subject: 'Performance Update',  message: 'Your persistency rate this month is 88.67%. Keep it up!', status: 'delivered' },
  ];

  for (const n of notifSeeds) {
    if (!n.userId) continue;
    await db.insert(notifications).values({
      userId: n.userId,
      channel: 'in-app',
      subject: n.subject,
      message: n.message,
      status: n.status,
      createdAtUtc: new Date(),
    });
  }
  console.log('  ✓  Notifications seeded.');

  // 15. Prospects (3 per agent) ─────────────────────────────────────────────
  console.log('\n  Seeding prospects...');
  const prospectPool = [
    { name: 'Andres Torres',    contact: '09171000001', temp: 'Warm', stage: 'Presentation', notes: 'Interested in PRULife Your Term. Set follow-up next week.' },
    { name: 'Beatriz Lim',      contact: '09182000002', temp: 'Cold', stage: 'Contacted',    notes: 'Called twice, no response. Try again next month.' },
    { name: 'Cesar Navarro',    contact: '09193000003', temp: 'Warm', stage: 'Client Agreed', notes: 'Agreed to policy presentation. Awaiting schedule.' },
    { name: 'Diana Flores',     contact: '09204000004', temp: 'Warm', stage: 'Approved',     notes: 'Application submitted, pending underwriting.' },
    { name: 'Eduardo Ramos',    contact: '09215000005', temp: 'Cold', stage: 'Contacted',    notes: 'Met at referral event. Needs product education first.' },
    { name: 'Fe Magbanua',      contact: '09226000006', temp: 'Warm', stage: 'Presentation', notes: 'Very interested in investment-linked plan.' },
    { name: 'Gregorio Aquino',  contact: '09237000007', temp: 'Cold', stage: 'Contacted',    notes: 'Referred by existing client. Initial call done.' },
    { name: 'Helena Pascual',   contact: '09248000008', temp: 'Warm', stage: 'Client Agreed', notes: 'Ready to proceed after Chinese New Year break.' },
    { name: 'Ignacio Salazar',  contact: '09259000009', temp: 'Warm', stage: 'Approved',     notes: 'Medical requirements submitted.' },
    { name: 'Josefina Vargas',  contact: '09260000010', temp: 'Cold', stage: 'Contacted',    notes: 'Works abroad; online meeting preferred.' },
    { name: 'Kristoffer Uy',    contact: '09271000011', temp: 'Warm', stage: 'Presentation', notes: 'Interested in family protection plan.' },
    { name: 'Lorenza Castro',   contact: '09282000012', temp: 'Warm', stage: 'Closed',       notes: 'Policy issued. Client satisfied.' },
    { name: 'Mariano Dela Paz', contact: '09293000013', temp: 'Cold', stage: 'Contacted',    notes: 'Skeptical about insurance. Needs trust-building.' },
    { name: 'Nilda Evangelista',contact: '09304000014', temp: 'Warm', stage: 'Presentation', notes: 'Doctor; high earning potential client.' },
    { name: 'Oswaldo Mercado',  contact: '09315000015', temp: 'Cold', stage: 'Contacted',    notes: 'Busy season; follow up in Q2.' },
  ];

  let pIdx = 0;
  for (const ag of AGENTS) {
    for (let c = 0; c < 3; c++) {
      const p = prospectPool[pIdx++ % prospectPool.length];
      const [existing] = await db.select({ id: prospects.id }).from(prospects)
        .where(eq(prospects.clientName, p.name)).limit(1);
      if (!existing) {
        await db.insert(prospects).values({
          agentCode: ag.agentCode,
          branchCode: BRANCH_CODE,
          clientName: p.name,
          contactNumber: p.contact,
          temperature: p.temp as 'Warm' | 'Cold',
          pipelineStage: p.stage as any,
          notes: p.notes,
          followUpDateUtc: daysAgo(-7 - pIdx),
          lastContactedAtUtc: daysAgo(pIdx),
          updatedAt: new Date(),
        });
      }
    }
  }
  console.log('  ✓  Prospects seeded (3 per agent).');

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete!\n');
  console.log('─────────────────────────────────────────────────────');
  console.log(`  Branch Manager : ${BM.email}`);
  for (const ag of AGENTS) {
    const email = makeEmail(ag.firstName, ag.lastName);
    console.log(`  Agent ${ag.agentCode}   : ${email}`);
  }
  console.log(`  Password (all) : ${DEFAULT_PASSWORD}`);
  console.log('─────────────────────────────────────────────────────');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
