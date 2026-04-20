import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const {
  listUsersMock,
  createUserMock,
  softDeleteUserMock,
  updateUserMock,
  restoreUserMock,
  resetPasswordMock,
} = vi.hoisted(() => ({
  listUsersMock: vi.fn(),
  createUserMock: vi.fn(),
  softDeleteUserMock: vi.fn(),
  updateUserMock: vi.fn(),
  restoreUserMock: vi.fn(),
  resetPasswordMock: vi.fn(),
}));

vi.mock('@/features/users/users.service', () => ({
  usersService: {
    listUsers: listUsersMock,
    createUser: createUserMock,
    softDeleteUser: softDeleteUserMock,
    updateUser: updateUserMock,
    restoreUser: restoreUserMock,
    resetPassword: resetPasswordMock,
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

vi.mock('@/features/phase-4-agent-workbench/agents/agents.service', () => ({
  agentsService: {
    getAgentProfile: vi.fn(),
    updateAgentProfile: vi.fn(),
  },
}));

vi.mock('@/features/phase-5-performance/metrics/metrics.service', () => ({
  metricsService: {
    getPerformanceMetrics: vi.fn(),
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

describe('users.routes', () => {
  beforeEach(() => {
    listUsersMock.mockReset();
    createUserMock.mockReset();
    softDeleteUserMock.mockReset();
    updateUserMock.mockReset();
    restoreUserMock.mockReset();
    resetPasswordMock.mockReset();
  });

  it('returns a paginated user list for Admin tokens', async () => {
    listUsersMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, pageSize: 10, hasNextPage: false },
    });

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'admin-id',
      sub: 'admin-id',
      role: 'Admin',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/users?page=1&pageSize=10',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().meta.pageSize).toBe(10);

    await app.close();
  });

  it('returns 400 for invalid user-list pagination', async () => {
    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'admin-id',
      sub: 'admin-id',
      role: 'Admin',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/users?pageSize=101',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('returns 403 for non-admin user-list access', async () => {
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
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(403);

    await app.close();
  });

  it('creates a user for Admin tokens', async () => {
    createUserMock.mockResolvedValue({
      id: 'new-user-id',
      firstName: 'New',
      lastName: 'User',
      email: 'new.user@example.com',
      role: 'Agent',
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
      deletedAtUtc: null,
    });

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'admin-id',
      sub: 'admin-id',
      role: 'Admin',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        firstName: 'New',
        lastName: 'User',
        email: 'new.user@example.com',
        password: 'password123',
        role: 'Agent',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().email).toBe('new.user@example.com');

    await app.close();
  });

  it('soft-deletes a user for Admin tokens', async () => {
    softDeleteUserMock.mockResolvedValue(undefined);

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'admin-id',
      sub: 'admin-id',
      role: 'Admin',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/7f5e658f-9b80-4c98-a7ca-53d08b2b4ad2',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(204);

    await app.close();
  });

  it('updates a user for Admin tokens', async () => {
    updateUserMock.mockResolvedValue({
      id: 'user-id',
      firstName: 'Updated',
      lastName: 'Name',
      email: 'updated.user@example.com',
      role: 'BranchManager',
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
      deletedAtUtc: null,
    });

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'admin-id',
      sub: 'admin-id',
      role: 'Admin',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/7f5e658f-9b80-4c98-a7ca-53d08b2b4ad2',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        firstName: 'Updated',
        lastName: 'Name',
        role: 'BranchManager',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().role).toBe('BranchManager');

    await app.close();
  });

  it('restores a user for Admin tokens', async () => {
    restoreUserMock.mockResolvedValue({
      message: 'User account restored.',
    });

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'admin-id',
      sub: 'admin-id',
      role: 'Admin',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/users/7f5e658f-9b80-4c98-a7ca-53d08b2b4ad2/restore',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().message).toBe('User account restored.');

    await app.close();
  });

  it('resets a user password for Admin tokens', async () => {
    resetPasswordMock.mockResolvedValue({
      message: 'Password reset initiated.',
    });

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'admin-id',
      sub: 'admin-id',
      role: 'Admin',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/users/7f5e658f-9b80-4c98-a7ca-53d08b2b4ad2/reset-password',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().message).toBe('Password reset initiated.');

    await app.close();
  });

  it('returns startup diagnostics', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/diagnostics/startup',
    });

    expect(response.statusCode).toBe(503);
    expect(response.json().status).toBe('degraded');

    await app.close();
  });
});


