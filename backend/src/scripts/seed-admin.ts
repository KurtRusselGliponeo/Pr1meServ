import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { userAccounts } from '../features/identity/identity.schema';
import { hashPassword } from '../shared/lib/auth';
import { encryptEmail, hashEmail, normalizeEmail } from '../shared/lib/encryption';

const DEFAULT_ADMIN_EMAIL = 'admin@a1prime.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin123!';
const DEFAULT_ADMIN_FIRST_NAME = 'System';
const DEFAULT_ADMIN_LAST_NAME = 'Admin';

async function seedAdmin() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL);
  const password = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  const firstName = (process.env.ADMIN_FIRST_NAME || DEFAULT_ADMIN_FIRST_NAME).trim();
  const lastName = (process.env.ADMIN_LAST_NAME || DEFAULT_ADMIN_LAST_NAME).trim();
  const role = 'Admin';

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters long.');
  }

  const emailHashValue = hashEmail(email);
  const [existingAdmin] = await db
    .select()
    .from(userAccounts)
    .where(eq(userAccounts.emailHash, emailHashValue))
    .limit(1);

  if (existingAdmin) {
    await db
      .update(userAccounts)
      .set({
        encryptedEmail: encryptEmail(email),
        passwordHash: await hashPassword(password),
        firstName,
        lastName,
        role,
        needsPasswordReset: false,
        deletedAtUtc: null,
        updatedAt: new Date(),
      })
      .where(eq(userAccounts.id, existingAdmin.id));

    console.log(`Admin account refreshed for ${email}.`);
    console.log(`Password: ${password}`);
    return;
  }

  await db.insert(userAccounts).values({
    emailHash: emailHashValue,
    encryptedEmail: encryptEmail(email),
    passwordHash: await hashPassword(password),
    firstName,
    lastName,
    role,
    needsPasswordReset: false,
    updatedAt: new Date(),
  });

  console.log('Admin account created successfully.');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
