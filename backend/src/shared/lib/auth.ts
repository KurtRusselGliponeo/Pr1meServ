import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';

const DEFAULT_ACCESS_TOKEN_EXPIRES_IN = '15m';
const DEFAULT_REFRESH_TOKEN_EXPIRES_IN = '7d';
const DEFAULT_BCRYPT_ROUNDS = 12;

export interface AuthTokenPayload {
  sub: string;
  emailHash: string;
  role: string;
  tokenType: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function getAccessTokenExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN?.trim() || DEFAULT_ACCESS_TOKEN_EXPIRES_IN;
}

export function getRefreshTokenExpiresIn(): string {
  return process.env.JWT_REFRESH_EXPIRES_IN?.trim() || DEFAULT_REFRESH_TOKEN_EXPIRES_IN;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required.');
  }

  return secret;
}

export function getRefreshJwtSecret(): string {
  return process.env.JWT_REFRESH_SECRET?.trim() || getJwtSecret();
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, DEFAULT_BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function generateTokenPair(
  app: FastifyInstance,
  basePayload: Omit<AuthTokenPayload, 'tokenType'>,
): Promise<TokenPair> {
  const accessToken = await app.jwt.sign(
    { ...basePayload, tokenType: 'access' },
    { expiresIn: getAccessTokenExpiresIn() },
  );

  const refreshToken = await app.jwt.sign(
    { ...basePayload, tokenType: 'refresh' },
    {
      expiresIn: getRefreshTokenExpiresIn(),
      key: getRefreshJwtSecret(),
    },
  );

  return { accessToken, refreshToken };
}

export async function verifyRefreshToken(
  app: FastifyInstance,
  refreshToken: string,
): Promise<AuthTokenPayload> {
  const payload = (await app.jwt.verify(refreshToken, {
    key: getRefreshJwtSecret(),
  })) as AuthTokenPayload;

  if (payload.tokenType !== 'refresh') {
    throw new Error('Invalid refresh token.');
  }

  return payload;
}
