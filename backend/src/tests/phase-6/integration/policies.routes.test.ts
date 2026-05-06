import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const { listPoliciesMock, getPolicyDetailMock, createPolicyMock, updatePolicyMock } = vi.hoisted(() => ({
  listPoliciesMock: vi.fn(),
  getPolicyDetailMock: vi.fn(),
  createPolicyMock: vi.fn(),
  updatePolicyMock: vi.fn(),
}));

vi.mock('@/features/policies/policies.service', () => ({
  policiesService: {
    listPolicies: listPoliciesMock,
    getPolicyDetail: getPolicyDetailMock,
    createPolicy: createPolicyMock,
    updatePolicy: updatePolicyMock,
  },
}));

vi.mock('@/features/admin/admin-policy.service', () => ({
  adminPolicyService: {
    listPolicies: listPoliciesMock,
    getPolicyDetail: getPolicyDetailMock,
    createPolicy: createPolicyMock,
    updatePolicy: updatePolicyMock,
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

describe('policies.routes', () => {
  beforeEach(() => {
    listPoliciesMock.mockReset();
    getPolicyDetailMock.mockReset();
    createPolicyMock.mockReset();
    updatePolicyMock.mockReset();
  });

  it('allows role-scoped list access for agents', async () => {
    listPoliciesMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, pageSize: 15, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    const app = await buildApp();
    const token = await tokenForRole(app, 'Agent');

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/policies?page=1&pageSize=15',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(listPoliciesMock).toHaveBeenCalled();
    await app.close();
  });

  it('creates policies for admin users only', async () => {
    createPolicyMock.mockResolvedValue({ id: 'policy-id' });
    const app = await buildApp();
    const adminToken = await tokenForRole(app, 'Admin');
    const agentToken = await tokenForRole(app, 'Agent');

    const allowedResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/policies',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        assignedAgentId: 'ef4cc46a-fb8d-4cae-b6c7-4f9da50c6db3',
        policyNumber: 'POL-001',
        branchCode: 'BR-01',
        policyOwnerName: 'Jamie Client',
        currency: 'PHP',
        mode: 'Monthly',
        modalPremium: 1000,
        sumAssured: 50000,
        api: 12000,
        policyStatus: 'Active',
      },
    });

    const blockedResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/policies',
      headers: { authorization: `Bearer ${agentToken}` },
      payload: {
        assignedAgentId: 'ef4cc46a-fb8d-4cae-b6c7-4f9da50c6db3',
        policyNumber: 'POL-002',
        branchCode: 'BR-01',
        policyOwnerName: 'Jamie Client',
        currency: 'PHP',
        mode: 'Monthly',
        modalPremium: 1000,
        sumAssured: 50000,
        api: 12000,
        policyStatus: 'Active',
      },
    });

    expect(allowedResponse.statusCode).toBe(201);
    expect(blockedResponse.statusCode).toBe(403);
    await app.close();
  });
});
