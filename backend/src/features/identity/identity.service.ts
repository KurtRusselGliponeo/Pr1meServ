import crypto from 'crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { createSigner } from 'fast-jwt';

import type {
  AuthenticatedUser,
  ForgotPasswordRequest,
  LoginResponse,
  RefreshTokenResponse,
  ResetPasswordRequest,
  ResetPasswordWithTokenRequest,
  UserRole,
} from '@a1prime/schemas';
import { db, withDbTransaction } from '@/db/client';
import { UnauthorizedError } from '@/lib/errors';
import { emailQueueService } from '@/features/notifications/email-queue.service';
import { agentProfiles, userAccounts } from '@/schema';
import { getJwtSecret, hashPassword, verifyPassword } from '@/shared/lib/auth';
import { logSystemAudit } from '@/shared/lib/audit';
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
const PASSWORD_RESET_TOKEN_EXPIRES_IN_MS = 60 * 60 * 1000;

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

function createPasswordResetToken() {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const hashedToken = crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');

  return {
    rawToken,
    hashedToken,
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRES_IN_MS),
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

async function findAuthRecordByPasswordResetTokenHash(
  passwordResetTokenHashValue: string,
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
        eq(userAccounts.passwordResetTokenHash, passwordResetTokenHashValue),
        gt(userAccounts.passwordResetTokenExpiresAtUtc, new Date()),
        isNull(userAccounts.deletedAtUtc),
      ),
    )
    .limit(1);

  return record ?? null;
}

export class AuthService {
  async forgotPassword(email: ForgotPasswordRequest['email']): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    const [record] = await db
      .select({
        userId: userAccounts.id,
        encryptedEmail: userAccounts.encryptedEmail,
        role: userAccounts.role,
        firstName: userAccounts.firstName,
        lastName: userAccounts.lastName,
      })
      .from(userAccounts)
      .where(
        and(
          eq(userAccounts.emailHash, hashEmail(normalizedEmail)),
          isNull(userAccounts.deletedAtUtc),
        ),
      )
      .limit(1);

    if (!record) {
      return;
    }

    const resetToken = createPasswordResetToken();
    const frontendBaseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const resetUrl = `${frontendBaseUrl.replace(/\/$/, '')}/auth/reset-password?token=${encodeURIComponent(resetToken.rawToken)}`;

    const emailPayload = await withDbTransaction('auth.forgot-password.issue-reset-token', async (tx) => {
      await tx
        .update(userAccounts)
        .set({
          passwordResetTokenHash: resetToken.hashedToken,
          passwordResetTokenExpiresAtUtc: resetToken.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(userAccounts.id, record.userId));

      await logSystemAudit(
        {
          action: 'auth.forgot-password',
          userId: record.userId,
          entityName: 'UserAccount',
          resourceId: record.userId,
          newValue: {
            firstName: record.firstName,
            lastName: record.lastName,
            role: record.role,
            passwordResetTokenExpiresAtUtc: resetToken.expiresAt.toISOString(),
          },
        },
        tx,
      );

      return {
        to: safeDecryptEmail(record.encryptedEmail, normalizedEmail),
        subject: 'Reset your A1 Prime password',
        text: `Hello ${record.firstName},\n\nWe received a request to reset your password. Use the link below to set a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`,
        html: `<p>Hello ${record.firstName},</p><p>We received a request to reset your password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>`,
        metadata: {
          templateType: 'FORGOT_PASSWORD',
          userId: record.userId,
        },
      };
    });

    await emailQueueService.enqueueEmail(emailPayload);
  }

  async completePasswordReset(
    rawToken: string,
    input: ResetPasswordWithTokenRequest,
  ): Promise<void> {
    const passwordResetTokenHashValue = crypto
      .createHash('sha256')
      .update(rawToken, 'utf8')
      .digest('hex');
    const record = await findAuthRecordByPasswordResetTokenHash(passwordResetTokenHashValue);

    if (!record) {
      throw new UnauthorizedError('Reset link is invalid or has expired.');
    }

    await withDbTransaction('auth.complete-password-reset', async (tx) => {
      await tx
        .update(userAccounts)
        .set({
          passwordHash: await hashPassword(input.password),
          needsPasswordReset: false,
          passwordResetTokenHash: null,
          passwordResetTokenExpiresAtUtc: null,
          refreshTokenHash: null,
          refreshTokenExpiresAtUtc: null,
          updatedAt: new Date(),
        })
        .where(eq(userAccounts.id, record.userId));

      await logSystemAudit(
        {
          action: 'auth.password-reset.completed',
          userId: record.userId,
          entityName: 'UserAccount',
          resourceId: record.userId,
          newValue: {
            role: record.role,
            completedVia: 'reset-link',
            needsPasswordReset: false,
          },
        },
        tx,
      );
    });
  }

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

  async login(email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = normalizeEmail(email);
    const record = await findAuthRecordByEmailHash(hashEmail(normalizedEmail));

    if (!record) {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

    const isPasswordMatch = await verifyPassword(password, record.passwordHash);

    if (!isPasswordMatch) {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

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

      await logSystemAudit(
        {
          action: 'auth.login',
          userId: record.userId,
          entityName: 'UserAccount',
          resourceId: record.userId,
          newValue: {
            role: record.role,
            agentCode: record.agentCode,
            needsPasswordReset: record.needsPasswordReset,
          },
        },
        tx,
      );
    });

    return {
      accessToken,
      refreshToken: nextRefreshToken.rawToken,
      user,
    };
  }

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

  async resetPassword(userId: string, input: ResetPasswordRequest): Promise<AuthenticatedUser> {
    const [record] = await withDbTransaction('auth.reset-password', async (tx) => {
      const updatedAt = new Date();

      const [updatedUser] = await tx
        .update(userAccounts)
        .set({
          passwordHash: await hashPassword(input.password),
          needsPasswordReset: false,
          passwordResetTokenHash: null,
          passwordResetTokenExpiresAtUtc: null,
          refreshTokenHash: null,
          refreshTokenExpiresAtUtc: null,
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

      await logSystemAudit(
        {
          action: 'auth.password-reset',
          userId,
          entityName: 'UserAccount',
          resourceId: userId,
          newValue: {
            needsPasswordReset: false,
          },
        },
        tx,
      );

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
