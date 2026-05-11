import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const { getPerformanceMetricsMock, getLeaderboardMock, buildCsvReportMock } = vi.hoisted(() => ({
  getPerformanceMetricsMock: vi.fn(),
  getLeaderboardMock: vi.fn(),
  buildCsvReportMock: vi.fn(),
}));

vi.mock('@/features/phase-5-performance/metrics/metrics.service', () => ({
  metricsService: {
    getPerformanceMetrics: getPerformanceMetricsMock,
    getLeaderboard: getLeaderboardMock,
    buildCsvReport: buildCsvReportMock,
  },
}));

vi.mock('@/features/identity/identity.service', () => ({
  authService: {
    login: vi.fn(),
    refreshToken: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

vi.mock('@/features/phase-3-reassignment/client-profiles/client-profiles.service', () => ({
  clientProfilesService: {
    listClientProfiles: vi.fn(),
    importClientProfile: vi.fn(),
    reassignClientProfiles: vi.fn(),
  },
}));

vi.mock('@/features/users/users.service', () => ({
  usersService: {
    listUsers: vi.fn(),
    createUser: vi.fn(),
    softDeleteUser: vi.fn(),
  },
}));

vi.mock('@/features/phase-4-agent-workbench/agents/agents.service', () => ({
  agentsService: {
    getAgentProfile: vi.fn(),
    updateAgentProfile: vi.fn(),
  },
}));

vi.mock('@/db/client', () => ({
  db: {
    transaction: vi.fn(),
    execute: vi.fn(),
    select: vi.fn(),
  },
  dbClient: {},
  assertDatabaseConnection: vi.fn().mockResolvedValue(undefined),
  assertRequiredDatabaseSchema: vi.fn().mockResolvedValue(undefined),
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
    getLeaderboardMock.mockReset();
    buildCsvReportMock.mockReset();
  });

  it('returns aggregated metrics for authenticated users', async () => {
    getPerformanceMetricsMock.mockResolvedValue({
      generatedAtUtc: new Date().toISOString(),
      scope: {
        role: 'Agent',
        branchCode: null,
        agentId: 'agent-profile-id',
      },
      summary: {
        activeAgents: 2,
        totalApi: 1000,
        totalModalPremium: 2000,
        totalCommission: 300,
        totalSales: 300,
        totalNap: 1000,
        totalApe: 2000,
        totalRecruitment: 1,
        atRiskCount: 2,
        lapsedCount: 1,
        reinstatementCount: 0,
        persistencyRate: 95,
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

  it('allows BranchManager to download a CSV report', async () => {
    buildCsvReportMock.mockResolvedValue('header1,header2\nvalue1,value2');

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'bm-user-id',
      sub: 'bm-user-id',
      role: 'BranchManager',
      agentId: 'branch-agent-id',
      agentCode: 'BM-001',
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/metrics/report?month=4&year=2026',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(buildCsvReportMock).toHaveBeenCalledOnce();

    await app.close();
  });
});


