import crypto from 'crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { createSigner } from 'fast-jwt';

import type { LoginResponse, RefreshTokenResponse, UserRole } from '@a1prime/schemas';
import { db, withDbTransaction } from '@/db/client';
import { UnauthorizedError } from '@/lib/errors';
import { agentProfiles, userAccounts } from '@/schema';
import { getJwtSecret, verifyPassword } from '@/shared/lib/auth';
import { decryptEmail, hashEmail, normalizeEmail } from '@/shared/lib/encryption';

type LoginUser = LoginResponse['user'];
type LoginResult = LoginResponse & { refreshToken: string };
type RefreshResult = RefreshTokenResponse & { refreshToken: string };

type AuthRecord = {
  userId: string;
  emailHash: string;
  encryptedEmail: string;
  passwordHash: string;
  role: UserRole;
  refreshTokenHash: string | null;
  refreshTokenExpiresAtUtc: Date | null;
  agentId: string | null;
  agentCode: string | null;
};

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 15 * 60;
const REFRESH_TOKEN_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000;

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
    role: record.role,
    agentCode: record.agentCode,
  };
}

async function findAuthRecordByEmailHash(emailHashValue: string): Promise<AuthRecord | null> {
  const [record] = await db
    .select({
      userId: userAccounts.id,
      emailHash: userAccounts.emailHash,
      encryptedEmail: userAccounts.encryptedEmail,
      passwordHash: userAccounts.passwordHash,
      role: userAccounts.role,
      refreshTokenHash: userAccounts.refreshTokenHash,
      refreshTokenExpiresAtUtc: userAccounts.refreshTokenExpiresAtUtc,
      agentId: agentProfiles.id,
      agentCode: agentProfiles.agentCode,
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
      role: userAccounts.role,
      refreshTokenHash: userAccounts.refreshTokenHash,
      refreshTokenExpiresAtUtc: userAccounts.refreshTokenExpiresAtUtc,
      agentId: agentProfiles.id,
      agentCode: agentProfiles.agentCode,
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

/**
 * Provides authentication use cases for Phase 3 auth endpoints.
 */
export class AuthService {
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
    const record = await findAuthRecordByEmailHash(hashEmail(normalizedEmail));

    if (!record) {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

    const isEmailMatch = decryptEmail(record.encryptedEmail) === normalizedEmail;
    const isPasswordMatch = await verifyPassword(password, record.passwordHash);

    if (!isEmailMatch || !isPasswordMatch) {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

    const user = mapLoginUser(record);
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
    const record = await findAuthRecordByRefreshTokenHash(refreshTokenHashValue);

    if (!record) {
      throw new UnauthorizedError('Unauthorized');
    }

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
}

export const authService = new AuthService();
