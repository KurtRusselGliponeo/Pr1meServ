import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const { loginMock, refreshTokenMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  refreshTokenMock: vi.fn(),
}));

vi.mock('@/services/auth.service', () => ({
  authService: {
    login: loginMock,
    refreshToken: refreshTokenMock,
  },
}));

vi.mock('@/services/client-profiles.service', () => ({
  clientProfilesService: {
    listClientProfiles: vi.fn(),
  },
}));

vi.mock('@/shared/db/client', () => ({
  db: {
    transaction: vi.fn(),
    execute: vi.fn(),
    select: vi.fn(),
  },
  dbClient: {},
  assertDatabaseConnection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/redis', () => ({
  redis: {
    status: 'ready',
    ping: vi.fn().mockResolvedValue('PONG'),
    on: vi.fn(),
    defineCommand: vi.fn(),
    rateLimit: vi.fn((key, timeWindow, _max, _continueExceeding, _exponentialBackoff, callback) => {
      const store =
        (
          globalThis as typeof globalThis & {
            __rateLimitCounts?: Map<string, number>;
          }
        ).__rateLimitCounts ?? new Map<string, number>();
      const current = (store.get(key) ?? 0) + 1;
      store.set(key, current);
      (
        globalThis as typeof globalThis & { __rateLimitCounts?: Map<string, number> }
      ).__rateLimitCounts = store;
      callback(null, [current, Number(timeWindow)]);
    }),
  },
  assertRedisConnection: vi.fn().mockResolvedValue(undefined),
}));

import { LoginResponseSchema } from '@a1prime/schemas';
import { UnauthorizedError } from '@/lib/errors';
import buildApp from '@/app';

describe('auth.routes', () => {
  beforeEach(() => {
    loginMock.mockReset();
    refreshTokenMock.mockReset();
    (
      globalThis as typeof globalThis & { __rateLimitCounts?: Map<string, number> }
    ).__rateLimitCounts = new Map<string, number>();
  });

  it('returns 200 and a refresh cookie for valid credentials', async () => {
    loginMock.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: '7f5e658f-9b80-4c98-a7ca-53d08b2b4ad2',
        role: 'Agent',
        agentCode: 'AG-001',
      },
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'agent@example.com',
        password: 'password123',
      },
      remoteAddress: '203.0.113.20',
    });

    expect(response.statusCode).toBe(200);
    expect(LoginResponseSchema.parse(response.json())).toBeTruthy();
    expect(response.headers['set-cookie']).toContain('refresh_token=');
    expect(response.headers['set-cookie']).toContain('HttpOnly');

    await app.close();
  });

  it('returns 400 when password is missing', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'agent@example.com',
      },
      remoteAddress: '203.0.113.20',
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 when email format is invalid', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'invalid',
        password: 'password123',
      },
      remoteAddress: '203.0.113.20',
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('returns 401 when the service rejects the credentials', async () => {
    loginMock.mockRejectedValue(new UnauthorizedError('Invalid email or password'));

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'agent@example.com',
        password: 'password123',
      },
      remoteAddress: '203.0.113.20',
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('returns 429 on the 6th request inside the rate limit window', async () => {
    loginMock.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: '7f5e658f-9b80-4c98-a7ca-53d08b2b4ad2',
        role: 'Agent',
        agentCode: 'AG-001',
      },
    });

    const app = await buildApp();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'agent@example.com',
          password: 'password123',
        },
        remoteAddress: '198.51.100.10',
      });

      expect(response.statusCode).toBe(200);
    }

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'agent@example.com',
        password: 'password123',
      },
      remoteAddress: '198.51.100.10',
    });

    expect(response.statusCode).toBe(429);

    await app.close();
  });
});
