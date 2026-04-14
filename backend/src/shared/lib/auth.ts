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

export function getAccessTokenExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN?.trim() || DEFAULT_ACCESS_TOKEN_EXPIRES_IN;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required.');
  }

  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, DEFAULT_BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
