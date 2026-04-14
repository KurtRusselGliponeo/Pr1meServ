import type { FastifyInstance } from 'fastify';
import type { SystemRole } from '@a1prime/schemas';
import { and, eq, isNull } from 'drizzle-orm';
import { userAccounts } from './identity.schema';
import { db } from '../../shared/db/client';
import { logSystemAudit, type AuditLogPayload } from '../../shared/lib/audit';
import { BusinessRuleError, UnauthorizedError } from '../../lib/errors';
import {
  generateTokenPair,
  hashPassword,
  verifyPassword,
  verifyRefreshToken,
} from '../../shared/lib/auth';
import { decryptEmail, encryptEmail, hashEmail, normalizeEmail } from '../../shared/lib/encryption';

type UserAccountRecord = typeof userAccounts.$inferSelect;
type NewUserAccountRecord = typeof userAccounts.$inferInsert;

interface IdentityRepository {
  findByEmailHash(emailHashValue: string): Promise<UserAccountRecord | null>;
  findById(id: string): Promise<UserAccountRecord | null>;
  createUser(payload: NewUserAccountRecord): Promise<UserAccountRecord>;
}

interface RegisterUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: SystemRole;
}

interface LoginInput {
  email: string;
  password: string;
}

const identityRepository: IdentityRepository = {
  async findByEmailHash(emailHashValue) {
    const [user] = await db
      .select()
      .from(userAccounts)
      .where(and(eq(userAccounts.emailHash, emailHashValue), isNull(userAccounts.deletedAtUtc)))
      .limit(1);

    return user ?? null;
  },

  async findById(id) {
    const [user] = await db
      .select()
      .from(userAccounts)
      .where(and(eq(userAccounts.id, id), isNull(userAccounts.deletedAtUtc)))
      .limit(1);

    return user ?? null;
  },

  async createUser(payload) {
    const [createdUser] = await db.insert(userAccounts).values(payload).returning();

    return createdUser;
  },
};

function createValidationError(message: string): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = 400;
  return error;
}

function sanitizeUser(user: UserAccountRecord) {
  return {
    id: user.id,
    email: decryptEmail(user.encryptedEmail),
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function validateRegistrationInput(input: RegisterUserInput): void {
  if (!input.email.trim()) {
    throw createValidationError('Email is required.');
  }

  if (!input.password.trim()) {
    throw createValidationError('Password is required.');
  }

  if (input.password.length < 8) {
    throw createValidationError('Password must be at least 8 characters long.');
  }

  if (!input.firstName.trim() || !input.lastName.trim()) {
    throw createValidationError('First name and last name are required.');
  }

  if (!input.role.trim()) {
    throw createValidationError('Role is required.');
  }
}

function validateLoginInput(input: LoginInput): void {
  if (!input.email.trim() || !input.password.trim()) {
    throw createValidationError('Email and password are required.');
  }
}

export class IdentityService {
  constructor(
    private readonly repository: IdentityRepository = identityRepository,
    private readonly auditLogger: (payload: AuditLogPayload) => Promise<void> = logSystemAudit,
  ) {}

  async registerUser(app: FastifyInstance, input: RegisterUserInput) {
    validateRegistrationInput(input);

    const normalizedEmail = normalizeEmail(input.email);
    const emailHashValue = hashEmail(normalizedEmail);
    const existingUser = await this.repository.findByEmailHash(emailHashValue);

    if (existingUser) {
      throw new BusinessRuleError('A user with this email already exists.');
    }

    const createdUser = await this.repository.createUser({
      emailHash: emailHashValue,
      encryptedEmail: encryptEmail(normalizedEmail),
      passwordHash: await hashPassword(input.password),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      role: input.role,
      updatedAt: new Date(),
    });

    await this.auditLogger({
      action: 'USER_REGISTERED',
      userId: createdUser.id,
      details: {
        emailHash: emailHashValue,
        role: createdUser.role,
      },
    });

    const tokens = await generateTokenPair(app, {
      sub: createdUser.id,
      emailHash: createdUser.emailHash,
      role: createdUser.role,
    });

    return {
      user: sanitizeUser(createdUser),
      tokens,
    };
  }

  async login(app: FastifyInstance, input: LoginInput) {
    validateLoginInput(input);

    const normalizedEmail = normalizeEmail(input.email);
    const emailHashValue = hashEmail(normalizedEmail);
    const existingUser = await this.repository.findByEmailHash(emailHashValue);

    if (!existingUser) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const isPasswordValid = await verifyPassword(input.password, existingUser.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    await this.auditLogger({
      action: 'USER_LOGGED_IN',
      userId: existingUser.id,
      details: {
        emailHash: existingUser.emailHash,
      },
    });

    const tokens = await generateTokenPair(app, {
      sub: existingUser.id,
      emailHash: existingUser.emailHash,
      role: existingUser.role,
    });

    return {
      user: sanitizeUser(existingUser),
      tokens,
    };
  }

  async refreshTokens(app: FastifyInstance, refreshToken: string) {
    if (!refreshToken.trim()) {
      throw createValidationError('Refresh token is required.');
    }

    const payload = await verifyRefreshToken(app, refreshToken);
    const existingUser = await this.repository.findById(payload.sub);

    if (!existingUser || existingUser.emailHash !== payload.emailHash) {
      throw new UnauthorizedError('Refresh token is invalid.');
    }

    await this.auditLogger({
      action: 'TOKEN_REFRESHED',
      userId: existingUser.id,
      details: {
        emailHash: existingUser.emailHash,
      },
    });

    const tokens = await generateTokenPair(app, {
      sub: existingUser.id,
      emailHash: existingUser.emailHash,
      role: existingUser.role,
    });

    return {
      user: sanitizeUser(existingUser),
      tokens,
    };
  }

  async getCurrentUser(userId: string) {
    const existingUser = await this.repository.findById(userId);

    if (!existingUser) {
      throw new UnauthorizedError('User not found.');
    }

    return {
      user: sanitizeUser(existingUser),
    };
  }

  async requestPasswordReset(email: string) {
    if (!email.trim()) {
      throw createValidationError('Email is required.');
    }

    return {
      message: 'If an account exists for that email, a reset link will be sent.',
    };
  }
}
