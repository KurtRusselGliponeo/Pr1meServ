import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const {
  listRecruitmentsMock,
  getRecruitmentDetailMock,
  createRecruitmentMock,
  updateRecruitmentMock,
  terminateRecruitmentMock,
  reinstateRecruitmentMock,
} = vi.hoisted(() => ({
  listRecruitmentsMock: vi.fn(),
  getRecruitmentDetailMock: vi.fn(),
  createRecruitmentMock: vi.fn(),
  updateRecruitmentMock: vi.fn(),
  terminateRecruitmentMock: vi.fn(),
  reinstateRecruitmentMock: vi.fn(),
}));

vi.mock('@/features/admin/recruitment.service', () => ({
  adminRecruitmentService: {
    listRecruitments: listRecruitmentsMock,
    getRecruitmentDetail: getRecruitmentDetailMock,
    createRecruitment: createRecruitmentMock,
    updateRecruitment: updateRecruitmentMock,
    terminateRecruitment: terminateRecruitmentMock,
    reinstateRecruitment: reinstateRecruitmentMock,
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

describe('recruitment.routes', () => {
  beforeEach(() => {
    listRecruitmentsMock.mockReset();
    getRecruitmentDetailMock.mockReset();
    createRecruitmentMock.mockReset();
    updateRecruitmentMock.mockReset();
    terminateRecruitmentMock.mockReset();
    reinstateRecruitmentMock.mockReset();
  });

  it('allows admin recruitment create and blocks non-admin roles', async () => {
    createRecruitmentMock.mockResolvedValue({ id: 'recruitment-id' });
    const app = await buildApp();
    const adminToken = await tokenForRole(app, 'Admin');
    const agentToken = await tokenForRole(app, 'Agent');

    const allowed = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/recruitments',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        agentId: 'ef4cc46a-fb8d-4cae-b6c7-4f9da50c6db3',
        dateAppointed: '2026-05-01T00:00:00.000Z',
        status: 'Active',
      },
    });

    const blocked = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/recruitments',
      headers: { authorization: `Bearer ${agentToken}` },
      payload: {
        agentId: 'ef4cc46a-fb8d-4cae-b6c7-4f9da50c6db3',
        dateAppointed: '2026-05-01T00:00:00.000Z',
        status: 'Active',
      },
    });

    expect(allowed.statusCode).toBe(201);
    expect(blocked.statusCode).toBe(403);
    await app.close();
  });
});
