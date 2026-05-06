import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const {
  listPlanCodesMock,
  createPlanCodeMock,
  updatePlanCodeMock,
  deactivatePlanCodeMock,
  reactivatePlanCodeMock,
  getPlanCodeMock,
} = vi.hoisted(() => ({
  listPlanCodesMock: vi.fn(),
  createPlanCodeMock: vi.fn(),
  updatePlanCodeMock: vi.fn(),
  deactivatePlanCodeMock: vi.fn(),
  reactivatePlanCodeMock: vi.fn(),
  getPlanCodeMock: vi.fn(),
}));

vi.mock('@/features/admin/plan-codes.service', () => ({
  planCodesService: {
    listPlanCodes: listPlanCodesMock,
    getPlanCode: getPlanCodeMock,
    createPlanCode: createPlanCodeMock,
    updatePlanCode: updatePlanCodeMock,
    deactivatePlanCode: deactivatePlanCodeMock,
    reactivatePlanCode: reactivatePlanCodeMock,
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

const planCodeRow = {
  id: '7f5e658f-9b80-4c98-a7ca-53d08b2b4ad2',
  planCode: 'PRU123',
  planName: 'PRU Plan 123',
  productCategory: 'Traditional',
  classification: 'OLUL',
  isActive: true,
  notes: null,
  createdAtUtc: new Date().toISOString(),
  updatedAtUtc: new Date().toISOString(),
};

async function adminToken(app: Awaited<ReturnType<typeof buildApp>>) {
  return app.jwt.sign({
    id: 'admin-id',
    sub: 'admin-id',
    role: 'Admin',
    agentId: null,
    agentCode: null,
    tokenType: 'access',
  });
}

async function agentToken(app: Awaited<ReturnType<typeof buildApp>>) {
  return app.jwt.sign({
    id: 'agent-id',
    sub: 'agent-id',
    role: 'Agent',
    agentId: 'agent-profile-id',
    agentCode: 'AG-001',
    tokenType: 'access',
  });
}

describe('plan-codes.routes', () => {
  beforeEach(() => {
    listPlanCodesMock.mockReset();
    createPlanCodeMock.mockReset();
    updatePlanCodeMock.mockReset();
    deactivatePlanCodeMock.mockReset();
    reactivatePlanCodeMock.mockReset();
    getPlanCodeMock.mockReset();
  });

  it('allows authenticated users to list active plan codes', async () => {
    listPlanCodesMock.mockResolvedValue([planCodeRow]);
    const app = await buildApp();
    const token = await agentToken(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/plan-codes?search=PRU',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(1);
    expect(listPlanCodesMock).toHaveBeenCalledWith({
      search: 'PRU',
      includeInactive: false,
    });

    await app.close();
  });

  it('blocks non-admin users from creating plan codes', async () => {
    const app = await buildApp();
    const token = await agentToken(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/plan-codes',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        planCode: 'PRU123',
        planName: 'PRU Plan 123',
        productCategory: 'Traditional',
        classification: 'OLUL',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(createPlanCodeMock).not.toHaveBeenCalled();

    await app.close();
  });

  it('creates a plan code for admin users', async () => {
    createPlanCodeMock.mockResolvedValue(planCodeRow);
    const app = await buildApp();
    const token = await adminToken(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/plan-codes',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        planCode: 'pru123',
        planName: 'PRU Plan 123',
        productCategory: 'Traditional',
        classification: 'OLUL',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().planCode).toBe('PRU123');
    expect(createPlanCodeMock).toHaveBeenCalledWith(
      expect.objectContaining({ planCode: 'PRU123' }),
      expect.objectContaining({ role: 'Admin' }),
    );

    await app.close();
  });

  it('updates and deactivates a plan code for admin users', async () => {
    updatePlanCodeMock.mockResolvedValue({ ...planCodeRow, planName: 'Updated Plan' });
    deactivatePlanCodeMock.mockResolvedValue({ ...planCodeRow, isActive: false });
    const app = await buildApp();
    const token = await adminToken(app);

    const updateResponse = await app.inject({
      method: 'PATCH',
      url: `/api/v1/plan-codes/${planCodeRow.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { planName: 'Updated Plan' },
    });

    const deactivateResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/plan-codes/${planCodeRow.id}/deactivate`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(deactivateResponse.statusCode).toBe(200);
    expect(updatePlanCodeMock).toHaveBeenCalledWith(
      planCodeRow.id,
      { planName: 'Updated Plan' },
      expect.objectContaining({ role: 'Admin' }),
    );
    expect(deactivatePlanCodeMock).toHaveBeenCalledWith(
      planCodeRow.id,
      expect.objectContaining({ role: 'Admin' }),
    );

    await app.close();
  });

  it('reactivates a plan code for admin users', async () => {
    reactivatePlanCodeMock.mockResolvedValue(planCodeRow);
    const app = await buildApp();
    const token = await adminToken(app);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/plan-codes/${planCodeRow.id}/reactivate`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(reactivatePlanCodeMock).toHaveBeenCalledWith(
      planCodeRow.id,
      expect.objectContaining({ role: 'Admin' }),
    );

    await app.close();
  });
});
