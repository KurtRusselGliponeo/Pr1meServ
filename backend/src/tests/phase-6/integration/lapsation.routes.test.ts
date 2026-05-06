import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const { getDashboardMock, updatePolicyStatusMock, reinstateRecordMock } = vi.hoisted(() => ({
  getDashboardMock: vi.fn(),
  updatePolicyStatusMock: vi.fn(),
  reinstateRecordMock: vi.fn(),
}));

vi.mock('@/features/phase-5-performance/lapsation/lapsation.service', () => ({
  lapsationService: {
    getDashboard: getDashboardMock,
    updatePolicyStatus: updatePolicyStatusMock,
    reinstateRecord: reinstateRecordMock,
  },
}));

vi.mock('@/features/identity/identity.service', () => ({
  authService: {
    login: vi.fn(),
    refreshToken: vi.fn(),
    getCurrentUser: vi.fn(),
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

vi.mock('@/db/migrations/validation', () => ({
  validateRequiredConstraints: vi.fn().mockResolvedValue({
    status: 'ok',
    checks: [],
  }),
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

vi.mock('@/shared/lib/queue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/queue')>();
  return {
    ...actual,
    getQueueHealthSummary: vi.fn().mockResolvedValue({
      enabled: false,
      status: 'disabled',
      redis: 'disabled',
      workerHeartbeat: {
        status: 'disabled',
        timestampUtc: null,
        ageMs: null,
      },
    }),
  };
});

import buildApp from '@/app';

async function tokenForRole(app: Awaited<ReturnType<typeof buildApp>>, role: 'Admin' | 'BranchManager' | 'Agent') {
  return app.jwt.sign({
    id: `${role.toLowerCase()}-id`,
    sub: `${role.toLowerCase()}-id`,
    role,
    agentId: role === 'Admin' ? null : `${role.toLowerCase()}-agent-id`,
    agentCode: role === 'Admin' ? null : `${role.slice(0, 2).toUpperCase()}-001`,
    tokenType: 'access',
  });
}

describe('lapsation.routes', () => {
  beforeEach(() => {
    getDashboardMock.mockReset();
    updatePolicyStatusMock.mockReset();
    reinstateRecordMock.mockReset();
  });

  it('allows agents to view their own alerts dashboard', async () => {
    getDashboardMock.mockResolvedValue({
      generatedAtUtc: new Date().toISOString(),
      thresholdDays: 30,
      scope: { role: 'Agent', branchCode: null, agentId: 'agent-id' },
      summary: { totalTracked: 1, atRiskCount: 1, reinstatedYtd: 0, criticalCount: 0, lapsedCount: 0 },
      records: [],
      timeline: [],
    });

    const app = await buildApp();
    const token = await tokenForRole(app, 'Agent');

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/lapsation',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(getDashboardMock).toHaveBeenCalled();
    await app.close();
  });

  it('allows admins to change policy status', async () => {
    updatePolicyStatusMock.mockResolvedValue({ id: 'history-id' });
    const app = await buildApp();
    const token = await tokenForRole(app, 'Admin');

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/lapsation/policies/ef4cc46a-fb8d-4cae-b6c7-4f9da50c6db3/status',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        status: 'At Risk',
        reason: 'Premium aging',
        followUpStatus: 'Open',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(updatePolicyStatusMock).toHaveBeenCalled();
    await app.close();
  });

  it('prevents agents from mutating policy status', async () => {
    const app = await buildApp();
    const token = await tokenForRole(app, 'Agent');

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/lapsation/policies/ef4cc46a-fb8d-4cae-b6c7-4f9da50c6db3/status',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        status: 'Lapsed',
        reason: 'Missed payment',
        followUpStatus: 'Open',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(updatePolicyStatusMock).not.toHaveBeenCalled();
    await app.close();
  });
});
