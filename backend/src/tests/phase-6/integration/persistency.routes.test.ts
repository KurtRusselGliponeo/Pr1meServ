import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const {
  listPersistencyRecordsMock,
  getPersistencyRecordMock,
  createPersistencyRecordMock,
  updatePersistencyRecordMock,
} = vi.hoisted(() => ({
  listPersistencyRecordsMock: vi.fn(),
  getPersistencyRecordMock: vi.fn(),
  createPersistencyRecordMock: vi.fn(),
  updatePersistencyRecordMock: vi.fn(),
}));

vi.mock('@/features/admin/persistency.service', () => ({
  persistencyService: {
    listPersistencyRecords: listPersistencyRecordsMock,
    getPersistencyRecord: getPersistencyRecordMock,
    createPersistencyRecord: createPersistencyRecordMock,
    updatePersistencyRecord: updatePersistencyRecordMock,
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
  db: { transaction: vi.fn(), execute: vi.fn(), select: vi.fn() },
  dbClient: {},
  assertDatabaseConnection: vi.fn().mockResolvedValue(undefined),
  assertRequiredDatabaseSchema: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/db/migrations/validation', () => ({
  validateRequiredConstraints: vi.fn().mockResolvedValue({ status: 'ok', checks: [] }),
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
      workerHeartbeat: { status: 'disabled', timestampUtc: null, ageMs: null },
    }),
  };
});

import buildApp from '@/app';

const record = {
  id: '7f5e658f-9b80-4c98-a7ca-53d08b2b4ad2',
  agentId: '8f5e658f-9b80-4c98-a7ca-53d08b2b4ad2',
  agentName: 'Agent One',
  agentCode: 'AG-001',
  recordMonth: '2026-03',
  branchCode: 'A1',
  agentType: 'Advisor',
  team: 'Alpha',
  personalPersistency: 84,
  unitPersistency: 88,
  branchPersistency: 91,
  isLowPersistency: true,
  notes: null,
  createdAtUtc: new Date().toISOString(),
  updatedAtUtc: new Date().toISOString(),
};

async function token(app: Awaited<ReturnType<typeof buildApp>>, role: 'Admin' | 'Agent') {
  return app.jwt.sign({
    id: `${role.toLowerCase()}-id`,
    sub: `${role.toLowerCase()}-id`,
    role,
    agentId: role === 'Agent' ? record.agentId : null,
    agentCode: role === 'Agent' ? 'AG-001' : null,
    tokenType: 'access',
  });
}

describe('persistency.routes', () => {
  beforeEach(() => {
    listPersistencyRecordsMock.mockReset();
    getPersistencyRecordMock.mockReset();
    createPersistencyRecordMock.mockReset();
    updatePersistencyRecordMock.mockReset();
  });

  it('allows authenticated scoped users to list persistency records', async () => {
    listPersistencyRecordsMock.mockResolvedValue({
      data: [record],
      meta: { total: 1, page: 1, pageSize: 25 },
    });
    const app = await buildApp();
    const authToken = await token(app, 'Agent');

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/persistency?recordMonth=2026-03&lowOnly=true',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data[0].isLowPersistency).toBe(true);
    expect(listPersistencyRecordsMock).toHaveBeenCalledWith(
      expect.objectContaining({ recordMonth: '2026-03', lowOnly: true }),
      expect.objectContaining({ role: 'Agent' }),
    );

    await app.close();
  });

  it('blocks non-admin users from creating persistency records', async () => {
    const app = await buildApp();
    const authToken = await token(app, 'Agent');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/persistency',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        agentId: record.agentId,
        recordMonth: '2026-03',
        personalPersistency: 90,
        unitPersistency: 90,
        branchPersistency: 90,
      },
    });

    expect(response.statusCode).toBe(403);
    expect(createPersistencyRecordMock).not.toHaveBeenCalled();

    await app.close();
  });

  it('validates rates when admins create persistency records', async () => {
    const app = await buildApp();
    const authToken = await token(app, 'Admin');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/persistency',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        agentId: record.agentId,
        recordMonth: '2026-03',
        personalPersistency: 101,
        unitPersistency: 90,
        branchPersistency: 90,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(createPersistencyRecordMock).not.toHaveBeenCalled();

    await app.close();
  });

  it('creates and updates persistency records for admin users', async () => {
    createPersistencyRecordMock.mockResolvedValue(record);
    updatePersistencyRecordMock.mockResolvedValue({ ...record, personalPersistency: 92 });
    const app = await buildApp();
    const authToken = await token(app, 'Admin');

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/persistency',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        agentId: record.agentId,
        recordMonth: '2026-03',
        personalPersistency: 84,
        unitPersistency: 88,
        branchPersistency: 91,
      },
    });
    const updateResponse = await app.inject({
      method: 'PATCH',
      url: `/api/v1/persistency/${record.id}`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { personalPersistency: 92 },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(updateResponse.statusCode).toBe(200);
    expect(createPersistencyRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({ recordMonth: '2026-03' }),
      expect.objectContaining({ role: 'Admin' }),
    );
    expect(updatePersistencyRecordMock).toHaveBeenCalledWith(
      record.id,
      { personalPersistency: 92 },
      expect.objectContaining({ role: 'Admin' }),
    );

    await app.close();
  });
});
