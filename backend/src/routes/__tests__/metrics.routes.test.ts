import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const { getPerformanceMetricsMock } = vi.hoisted(() => ({
  getPerformanceMetricsMock: vi.fn(),
}));

vi.mock('@/services/metrics.service', () => ({
  metricsService: {
    getPerformanceMetrics: getPerformanceMetricsMock,
  },
}));

vi.mock('@/services/auth.service', () => ({
  authService: {
    login: vi.fn(),
    refreshToken: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

vi.mock('@/services/client-profiles.service', () => ({
  clientProfilesService: {
    listClientProfiles: vi.fn(),
    importClientProfile: vi.fn(),
    reassignClientProfiles: vi.fn(),
  },
}));

vi.mock('@/services/users.service', () => ({
  usersService: {
    listUsers: vi.fn(),
    createUser: vi.fn(),
    softDeleteUser: vi.fn(),
  },
}));

vi.mock('@/services/agents.service', () => ({
  agentsService: {
    getAgentProfile: vi.fn(),
    updateAgentProfile: vi.fn(),
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
  isRedisEnabled: false,
  redis: {
    status: 'ready',
    ping: vi.fn().mockResolvedValue('PONG'),
    on: vi.fn(),
    duplicate: vi.fn(() => ({ on: vi.fn() })),
    defineCommand: vi.fn(),
    rateLimit: vi.fn((key, timeWindow, _max, _continueExceeding, _exponentialBackoff, callback) => {
      callback(null, [1, Number(timeWindow)]);
    }),
  },
  assertRedisConnection: vi.fn().mockResolvedValue(undefined),
}));

import buildApp from '@/app';

describe('metrics.routes', () => {
  beforeEach(() => {
    getPerformanceMetricsMock.mockReset();
  });

  it('returns aggregated metrics for authenticated users', async () => {
    getPerformanceMetricsMock.mockResolvedValue({
      generatedAtUtc: new Date().toISOString(),
      summary: {
        activeAgents: 2,
        totalApi: 1000,
        totalModalPremium: 2000,
        totalCommission: 300,
      },
      points: [],
    });

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'agent-id',
      sub: 'agent-id',
      role: 'Agent',
      agentId: 'agent-profile-id',
      agentCode: 'AG-001',
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/metrics?month=4&year=2026&role=all',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().summary.activeAgents).toBe(2);

    await app.close();
  });

  it('returns 400 for invalid metrics query params', async () => {
    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'agent-id',
      sub: 'agent-id',
      role: 'Agent',
      agentId: 'agent-profile-id',
      agentCode: 'AG-001',
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/metrics?month=13&year=1999',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('returns 401 when no token is provided to metrics', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/metrics?month=4&year=2026',
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});
