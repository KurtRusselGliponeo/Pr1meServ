import bcrypt from 'bcryptjs';
import type { UserRole } from '@a1prime/schemas';

const DEFAULT_ACCESS_TOKEN_EXPIRES_IN = '15m';
const DEFAULT_BCRYPT_ROUNDS = 12;

export interface AuthTokenPayload {
  id: string;
  sub: string;
  role: UserRole;
  agentId: string | null;
  agentCode: string | null;
  tokenType: 'access';
}

/**
 * Returns the configured access-token lifetime string.
 *
 * @returns The JWT expiration interval used for access tokens.
 */
export function getAccessTokenExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN?.trim() || DEFAULT_ACCESS_TOKEN_EXPIRES_IN;
}

/**
 * Returns the configured JWT signing secret.
 *
 * @returns The JWT secret from environment configuration.
 * @throws {Error} When the secret is missing.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required.');
  }

  return secret;
}

/**
 * Hashes a plaintext password using bcrypt.
 *
 * @param password Plaintext password.
 * @returns The hashed password string.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, DEFAULT_BCRYPT_ROUNDS);
}

/**
 * Verifies a plaintext password against a bcrypt hash.
 *
 * @param password Plaintext password.
 * @param passwordHash Stored bcrypt password hash.
 * @returns True when the password matches the hash.
 */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
