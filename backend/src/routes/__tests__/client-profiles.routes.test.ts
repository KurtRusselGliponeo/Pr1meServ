import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const { listClientProfilesMock, importClientProfileMock, reassignClientProfilesMock } = vi.hoisted(
  () => ({
    listClientProfilesMock: vi.fn(),
    importClientProfileMock: vi.fn(),
    reassignClientProfilesMock: vi.fn(),
  }),
);

vi.mock('@/services/client-profiles.service', () => ({
  clientProfilesService: {
    listClientProfiles: listClientProfilesMock,
    importClientProfile: importClientProfileMock,
    reassignClientProfiles: reassignClientProfilesMock,
  },
}));

vi.mock('@/services/auth.service', () => ({
  authService: {
    login: vi.fn(),
    refreshToken: vi.fn(),
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
      callback(null, [1, Number(timeWindow)]);
    }),
  },
  assertRedisConnection: vi.fn().mockResolvedValue(undefined),
}));

import { ListClientProfilesResponseSchema } from '@a1prime/schemas';
import buildApp from '@/app';

describe('client-profiles.routes', () => {
  beforeEach(() => {
    listClientProfilesMock.mockReset();
    importClientProfileMock.mockReset();
    reassignClientProfilesMock.mockReset();
  });

  it('returns a paginated list scoped for an Agent token', async () => {
    listClientProfilesMock.mockResolvedValue({
      data: [],
      meta: {
        total: 0,
        page: 1,
        pageSize: 25,
        hasNextPage: false,
      },
    });

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'agent-user-id',
      sub: 'agent-user-id',
      role: 'Agent',
      agentId: 'agent-profile-id',
      agentCode: 'AG-001',
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/client-profiles?page=1&pageSize=25',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(ListClientProfilesResponseSchema.parse(response.json())).toBeTruthy();

    await app.close();
  });

  it('returns a paginated list for a BranchManager token with agentId filter', async () => {
    listClientProfilesMock.mockResolvedValue({
      data: [],
      meta: {
        total: 0,
        page: 1,
        pageSize: 25,
        hasNextPage: false,
      },
    });

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'manager-user-id',
      sub: 'manager-user-id',
      role: 'BranchManager',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/client-profiles?page=1&pageSize=25&agentId=de6beb8c-7781-43dd-b28f-3d5a07f489dc',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);

    await app.close();
  });

  it('returns 400 for pageSize values over 100', async () => {
    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'manager-user-id',
      sub: 'manager-user-id',
      role: 'BranchManager',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/client-profiles?pageSize=200',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('returns 401 when no token is provided', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/client-profiles',
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('returns 403 for a token with an invalid role', async () => {
    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'invalid-user-id',
      sub: 'invalid-user-id',
      role: 'UnknownRole',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    } as never);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/client-profiles',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(403);

    await app.close();
  });

  it('allows a BranchManager to submit a reassignment batch', async () => {
    reassignClientProfilesMock.mockResolvedValue({
      reassignedCount: 2,
    });

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'manager-user-id',
      sub: 'manager-user-id',
      role: 'BranchManager',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/client-profiles/reassign',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        sourceAgentId: 'de6beb8c-7781-43dd-b28f-3d5a07f489dc',
        destinationAgentId: 'b13df722-f7f2-4061-b2f4-572346f3d90b',
        clientProfileIds: ['3a3b00ff-bbdf-4a76-b0c1-9a222fce0db8'],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ reassignedCount: 2 });

    await app.close();
  });
});
