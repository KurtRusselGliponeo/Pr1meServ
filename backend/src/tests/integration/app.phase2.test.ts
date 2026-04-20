process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

jest.mock('../../db/client', () => ({
  db: {
    transaction: jest.fn(),
    execute: jest.fn(),
    select: jest.fn(),
    insert: jest.fn(),
  },
  dbClient: {},
  assertDatabaseConnection: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/redis', () => ({
  redis: {
    status: 'ready',
    ping: jest.fn().mockResolvedValue('PONG'),
    on: jest.fn(),
    defineCommand: jest.fn(),
    rateLimit: jest.fn(
      (key, timeWindow, max, _continueExceeding, _exponentialBackoff, callback) => {
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
      },
    ),
  },
  assertRedisConnection: jest.fn().mockResolvedValue(undefined),
}));

import buildApp from '../../app';

describe('Phase 2 app behavior', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { __rateLimitCounts?: Map<string, number> }
    ).__rateLimitCounts = new Map<string, number>();
  });

  it('returns the standard error body for unknown routes', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/does-not-exist',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: 'NotFoundError',
      message: 'The requested resource was not found.',
      details: [],
    });

    await app.close();
  });

  it('rate limits login after five requests and includes retry-after', async () => {
    const app = await buildApp();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'not-an-email',
          password: 'password123',
        },
        remoteAddress: '203.0.113.10',
      });

      expect(response.statusCode).toBe(400);
    }

    const limitedResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'not-an-email',
        password: 'password123',
      },
      remoteAddress: '203.0.113.10',
    });

    expect(limitedResponse.statusCode).toBe(429);
    expect(limitedResponse.headers['retry-after']).toBeDefined();
    expect(limitedResponse.json()).toEqual({
      error: 'RateLimitExceeded',
      message: 'Too many requests. Please try again later.',
      details: [],
    });

    await app.close();
  });

  it('rejects an authenticated agent from an admin-only route', async () => {
    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'agent-1',
      sub: 'agent-1',
      role: 'Agent',
      agentId: 'agent-profile-1',
      agentCode: 'AG-001',
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/admin-only',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: 'ForbiddenError',
      message: 'You do not have permission to access this resource.',
      details: [],
    });

    await app.close();
  });

  it('rejects a missing token on an admin-only route', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/admin-only',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: 'UnauthorizedError',
      message: 'Unauthorized',
      details: [],
    });

    await app.close();
  });
});
