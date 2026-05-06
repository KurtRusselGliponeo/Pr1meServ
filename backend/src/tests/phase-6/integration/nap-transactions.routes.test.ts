import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const {
  listTransactionsMock,
  getTransactionDetailMock,
  createTransactionMock,
  updateTransactionMock,
} = vi.hoisted(() => ({
  listTransactionsMock: vi.fn(),
  getTransactionDetailMock: vi.fn(),
  createTransactionMock: vi.fn(),
  updateTransactionMock: vi.fn(),
}));

vi.mock('@/features/admin/nap-transactions.service', () => ({
  adminNapTransactionsService: {
    listTransactions: listTransactionsMock,
    getTransactionDetail: getTransactionDetailMock,
    createTransaction: createTransactionMock,
    updateTransaction: updateTransactionMock,
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

describe('nap-transactions.routes', () => {
  beforeEach(() => {
    listTransactionsMock.mockReset();
    getTransactionDetailMock.mockReset();
    createTransactionMock.mockReset();
    updateTransactionMock.mockReset();
  });

  it('creates NAP transactions for admin users only', async () => {
    createTransactionMock.mockResolvedValue({ id: 'nap-id' });
    const app = await buildApp();
    const adminToken = await tokenForRole(app, 'Admin');
    const agentToken = await tokenForRole(app, 'Agent');

    const allowedResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/nap-transactions',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        policyId: 'ef4cc46a-fb8d-4cae-b6c7-4f9da50c6db3',
        policyNumber: 'POL-001',
        transactionDate: '2026-05-01T00:00:00.000Z',
        transactionType: 'Issued',
        api: 12000,
      },
    });

    const blockedResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/nap-transactions',
      headers: { authorization: `Bearer ${agentToken}` },
      payload: {
        policyId: 'ef4cc46a-fb8d-4cae-b6c7-4f9da50c6db3',
        policyNumber: 'POL-001',
        transactionDate: '2026-05-01T00:00:00.000Z',
        transactionType: 'Issued',
        api: 12000,
      },
    });

    expect(allowedResponse.statusCode).toBe(201);
    expect(blockedResponse.statusCode).toBe(403);
    await app.close();
  });

  it('blocks agents from updating NAP transactions', async () => {
    const app = await buildApp();
    const agentToken = await tokenForRole(app, 'Agent');

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/nap-transactions/nap-id',
      headers: { authorization: `Bearer ${agentToken}` },
      payload: {
        transactionType: 'Lapsed',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(updateTransactionMock).not.toHaveBeenCalled();
    await app.close();
  });
});
