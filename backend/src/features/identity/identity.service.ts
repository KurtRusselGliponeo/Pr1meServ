import crypto from 'crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { createSigner } from 'fast-jwt';

import type {
  AuthenticatedUser,
  LoginResponse,
  RefreshTokenResponse,
  ResetPasswordRequest,
  UserRole,
} from '@a1prime/schemas';
import { db, withDbTransaction } from '@/db/client';
import { UnauthorizedError } from '@/lib/errors';
import { agentProfiles, userAccounts } from '@/schema';
import { getJwtSecret, hashPassword, verifyPassword } from '@/shared/lib/auth';
import { decryptEmail, hashEmail, normalizeEmail } from '@/shared/lib/encryption';

type LoginUser = LoginResponse['user'];
type LoginResult = LoginResponse & { refreshToken: string };
type RefreshResult = RefreshTokenResponse & { refreshToken: string };

type AuthRecord = {
  userId: string;
  emailHash: string;
  encryptedEmail: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  refreshTokenHash: string | null;
  refreshTokenExpiresAtUtc: Date | null;
  agentId: string | null;
  agentCode: string | null;
  needsPasswordReset: boolean;
  createdAtUtc: Date;
  updatedAtUtc: Date;
};

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 15 * 60;
const REFRESH_TOKEN_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000;

function roleNeedsLinkedProfile(role: UserRole): boolean {
  return role === 'Agent' || role === 'BranchManager';
}

function buildFallbackAgentCode(role: UserRole, userId: string): string {
  const compactId = userId.replace(/-/g, '').slice(0, 8).toUpperCase();
  const prefix = role === 'BranchManager' ? 'BM' : 'AG';
  return `${prefix}-${compactId}`;
}

function safeDecryptEmail(payload: string, fallback = 'unknown@local'): string {
  try {
    return decryptEmail(payload);
  } catch {
    return fallback;
  }
}

function buildAccessToken(user: LoginUser, agentId: string | null): string {
  const signAccessToken = createSigner({
    key: getJwtSecret(),
    expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  });

  return signAccessToken({
    id: user.id,
    sub: user.id,
    role: user.role,
    agentId,
    agentCode: user.agentCode,
    tokenType: 'access',
  });
}

function createRefreshToken() {
  const rawToken = crypto.randomBytes(48).toString('base64url');
  const hashedToken = crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');

  return {
    rawToken,
    hashedToken,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS),
  };
}

function mapLoginUser(record: AuthRecord): LoginUser {
  return {
    id: record.userId,
    email: safeDecryptEmail(record.encryptedEmail),
    firstName: record.firstName,
    lastName: record.lastName,
    role: record.role,
    agentCode: record.agentCode,
    needsPasswordReset: record.needsPasswordReset,
    createdAtUtc: record.createdAtUtc.toISOString(),
    updatedAtUtc: record.updatedAtUtc.toISOString(),
  };
}

async function findAuthRecordByEmailHash(emailHashValue: string): Promise<AuthRecord | null> {
  const [record] = await db
    .select({
      userId: userAccounts.id,
      emailHash: userAccounts.emailHash,
      encryptedEmail: userAccounts.encryptedEmail,
      passwordHash: userAccounts.passwordHash,
      firstName: userAccounts.firstName,
      lastName: userAccounts.lastName,
      role: userAccounts.role,
      refreshTokenHash: userAccounts.refreshTokenHash,
      refreshTokenExpiresAtUtc: userAccounts.refreshTokenExpiresAtUtc,
      agentId: agentProfiles.id,
      agentCode: agentProfiles.agentCode,
      needsPasswordReset: userAccounts.needsPasswordReset,
      createdAtUtc: userAccounts.createdAt,
      updatedAtUtc: userAccounts.updatedAt,
    })
    .from(userAccounts)
    .leftJoin(
      agentProfiles,
      and(eq(agentProfiles.userId, userAccounts.id), isNull(agentProfiles.deletedAtUtc)),
    )
    .where(and(eq(userAccounts.emailHash, emailHashValue), isNull(userAccounts.deletedAtUtc)))
    .limit(1);

  return record ?? null;
}

async function findAuthRecordByRefreshTokenHash(
  refreshTokenHashValue: string,
): Promise<AuthRecord | null> {
  const [record] = await db
    .select({
      userId: userAccounts.id,
      emailHash: userAccounts.emailHash,
      encryptedEmail: userAccounts.encryptedEmail,
      passwordHash: userAccounts.passwordHash,
      firstName: userAccounts.firstName,
      lastName: userAccounts.lastName,
      role: userAccounts.role,
      refreshTokenHash: userAccounts.refreshTokenHash,
      refreshTokenExpiresAtUtc: userAccounts.refreshTokenExpiresAtUtc,
      agentId: agentProfiles.id,
      agentCode: agentProfiles.agentCode,
      needsPasswordReset: userAccounts.needsPasswordReset,
      createdAtUtc: userAccounts.createdAt,
      updatedAtUtc: userAccounts.updatedAt,
    })
    .from(userAccounts)
    .leftJoin(
      agentProfiles,
      and(eq(agentProfiles.userId, userAccounts.id), isNull(agentProfiles.deletedAtUtc)),
    )
    .where(
      and(
        eq(userAccounts.refreshTokenHash, refreshTokenHashValue),
        gt(userAccounts.refreshTokenExpiresAtUtc, new Date()),
        isNull(userAccounts.deletedAtUtc),
      ),
    )
    .limit(1);

  return record ?? null;
}

async function resolveFallbackBranchCode(): Promise<string> {
  const [existingBranch] = await db
    .select({ branchCode: agentProfiles.branchCode })
    .from(agentProfiles)
    .where(isNull(agentProfiles.deletedAtUtc))
    .limit(1);

  return existingBranch?.branchCode?.trim() || 'BR-01';
}

async function ensureLinkedProfile(record: AuthRecord): Promise<AuthRecord> {
  if (!roleNeedsLinkedProfile(record.role) || record.agentId) {
    return record;
  }

  const fallbackBranchCode = await resolveFallbackBranchCode();
  const fallbackAgentCode = buildFallbackAgentCode(record.role, record.userId);
  const displayName = `${record.firstName} ${record.lastName}`.trim();
  const updatedAt = new Date();

  const [linkedProfile] = await withDbTransaction('auth.ensure-linked-profile', async (tx) => {
    const [existingProfile] = await tx
      .select({
        id: agentProfiles.id,
        agentCode: agentProfiles.agentCode,
        branchCode: agentProfiles.branchCode,
      })
      .from(agentProfiles)
      .where(eq(agentProfiles.userId, record.userId))
      .limit(1);

    if (existingProfile) {
      const [restoredProfile] = await tx
        .update(agentProfiles)
        .set({
          agentCode: existingProfile.agentCode?.trim() || fallbackAgentCode,
          branchCode: existingProfile.branchCode?.trim() || fallbackBranchCode,
          displayName,
          deletedAtUtc: null,
          updatedAt,
        })
        .where(eq(agentProfiles.id, existingProfile.id))
        .returning({
          id: agentProfiles.id,
          agentCode: agentProfiles.agentCode,
          branchCode: agentProfiles.branchCode,
        });

      return [restoredProfile];
    }

    const [createdProfile] = await tx
      .insert(agentProfiles)
      .values({
        userId: record.userId,
        agentCode: fallbackAgentCode,
        branchCode: fallbackBranchCode,
        displayName,
        updatedAt,
      })
      .returning({
        id: agentProfiles.id,
        agentCode: agentProfiles.agentCode,
        branchCode: agentProfiles.branchCode,
      });

    return [createdProfile];
  });

  return {
    ...record,
    agentId: linkedProfile?.id ?? null,
    agentCode: linkedProfile?.agentCode ?? record.agentCode,
  };
}

export class AuthService {
  /**
   * Returns the current authenticated user profile for `/auth/me`.
   *
   * @param userId Authenticated user id from the access token.
   * @returns The hydrated authenticated user profile.
   * @throws {UnauthorizedError} if the user no longer exists.
   */
  async getCurrentUser(userId: string): Promise<AuthenticatedUser> {
    const [record] = await db
      .select({
        userId: userAccounts.id,
        emailHash: userAccounts.emailHash,
        encryptedEmail: userAccounts.encryptedEmail,
        passwordHash: userAccounts.passwordHash,
        firstName: userAccounts.firstName,
        lastName: userAccounts.lastName,
        role: userAccounts.role,
        refreshTokenHash: userAccounts.refreshTokenHash,
        refreshTokenExpiresAtUtc: userAccounts.refreshTokenExpiresAtUtc,
        agentId: agentProfiles.id,
        agentCode: agentProfiles.agentCode,
        needsPasswordReset: userAccounts.needsPasswordReset,
        createdAtUtc: userAccounts.createdAt,
        updatedAtUtc: userAccounts.updatedAt,
      })
      .from(userAccounts)
      .leftJoin(
        agentProfiles,
        and(eq(agentProfiles.userId, userAccounts.id), isNull(agentProfiles.deletedAtUtc)),
      )
      .where(and(eq(userAccounts.id, userId), isNull(userAccounts.deletedAtUtc)))
      .limit(1);

    if (!record) {
      throw new UnauthorizedError('Unauthorized');
    }

    return mapLoginUser(record);
  }

  /**
   * Authenticates a user with an email/password pair.
   *
   * @param email Submitted email address.
   * @param password Submitted plaintext password.
   * @returns LoginResponse with a rotated refresh token.
   * @throws {UnauthorizedError} if credentials are invalid.
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = normalizeEmail(email);
    const authRecord = await findAuthRecordByEmailHash(hashEmail(normalizedEmail));

    if (!authRecord) {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

    const isPasswordMatch = await verifyPassword(password, authRecord.passwordHash);

    if (!isPasswordMatch) {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

    const record = await ensureLinkedProfile(authRecord);

    const user = {
      ...mapLoginUser(record),
      email: normalizedEmail,
    };
    const accessToken = buildAccessToken(user, record.agentId);
    const nextRefreshToken = createRefreshToken();

    await withDbTransaction('auth.login.persist-refresh-token', async (tx) => {
      await tx
        .update(userAccounts)
        .set({
          refreshTokenHash: nextRefreshToken.hashedToken,
          refreshTokenExpiresAtUtc: nextRefreshToken.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(userAccounts.id, record.userId));
    });

    return {
      accessToken,
      refreshToken: nextRefreshToken.rawToken,
      user,
    };
  }

  /**
   * Rotates a submitted refresh token and returns a new access token.
   *
   * @param rawRefreshToken Raw refresh token value from the cookie.
   * @returns A new access token plus the rotated refresh token.
   * @throws {UnauthorizedError} if the refresh token is invalid or expired.
   */
  async refreshToken(rawRefreshToken: string): Promise<RefreshResult> {
    const refreshTokenHashValue = crypto
      .createHash('sha256')
      .update(rawRefreshToken, 'utf8')
      .digest('hex');
    const authRecord = await findAuthRecordByRefreshTokenHash(refreshTokenHashValue);

    if (!authRecord) {
      throw new UnauthorizedError('Unauthorized');
    }

    const record = await ensureLinkedProfile(authRecord);

    const user = mapLoginUser(record);
    const accessToken = buildAccessToken(user, record.agentId);
    const nextRefreshToken = createRefreshToken();

    await withDbTransaction('auth.refresh.rotate-refresh-token', async (tx) => {
      await tx
        .update(userAccounts)
        .set({
          refreshTokenHash: nextRefreshToken.hashedToken,
          refreshTokenExpiresAtUtc: nextRefreshToken.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(userAccounts.id, record.userId));
    });

    return {
      accessToken,
      refreshToken: nextRefreshToken.rawToken,
    };
  }

  async resetPassword(userId: string, input: ResetPasswordRequest): Promise<AuthenticatedUser> {
    const [record] = await withDbTransaction('auth.reset-password', async (tx) => {
      const updatedAt = new Date();

      const [updatedUser] = await tx
        .update(userAccounts)
        .set({
          passwordHash: await hashPassword(input.password),
          needsPasswordReset: false,
          updatedAt,
        })
        .where(and(eq(userAccounts.id, userId), isNull(userAccounts.deletedAtUtc)))
        .returning({
          userId: userAccounts.id,
          emailHash: userAccounts.emailHash,
          encryptedEmail: userAccounts.encryptedEmail,
          passwordHash: userAccounts.passwordHash,
          firstName: userAccounts.firstName,
          lastName: userAccounts.lastName,
          role: userAccounts.role,
          refreshTokenHash: userAccounts.refreshTokenHash,
          refreshTokenExpiresAtUtc: userAccounts.refreshTokenExpiresAtUtc,
          needsPasswordReset: userAccounts.needsPasswordReset,
          createdAtUtc: userAccounts.createdAt,
          updatedAtUtc: userAccounts.updatedAt,
        });

      if (!updatedUser) {
        throw new UnauthorizedError('Unauthorized');
      }

      const [agentProfile] = await tx
        .select({
          agentId: agentProfiles.id,
          agentCode: agentProfiles.agentCode,
        })
        .from(agentProfiles)
        .where(and(eq(agentProfiles.userId, userId), isNull(agentProfiles.deletedAtUtc)))
        .limit(1);

      return [
        {
          ...updatedUser,
          agentId: agentProfile?.agentId ?? null,
          agentCode: agentProfile?.agentCode ?? null,
        } satisfies AuthRecord,
      ];
    });

    return mapLoginUser(record);
  }
}

export const authService = new AuthService();
