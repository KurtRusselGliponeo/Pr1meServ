import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const { getNotificationLogsMock } = vi.hoisted(() => ({
  getNotificationLogsMock: vi.fn(),
}));

vi.mock('@/features/notifications/notifications.service', () => ({
  notificationsService: {
    getNotificationLogs: getNotificationLogsMock,
  },
}));

vi.mock('@/features/identity/identity.service', () => ({
  authService: {
    login: vi.fn(),
    refreshToken: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

vi.mock('@/features/client-profiles/client-profiles.service', () => ({
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
    updateUser: vi.fn(),
    restoreUser: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

vi.mock('@/features/agents/agents.service', () => ({
  agentsService: {
    getAgentProfile: vi.fn(),
    updateAgentProfile: vi.fn(),
  },
}));

vi.mock('@/features/metrics/metrics.service', () => ({
  metricsService: {
    getPerformanceMetrics: vi.fn(),
    getLeaderboard: vi.fn(),
  },
}));

vi.mock('@/features/documents/documents.service', () => ({
  documentsService: {
    generatePresignedUrl: vi.fn(),
    fetchDocuments: vi.fn(),
    getDocumentHistory: vi.fn(),
    updatePinnedState: vi.fn(),
    markCosafUploadComplete: vi.fn(),
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

import buildApp from '@/app';

describe('notifications.routes', () => {
  beforeEach(() => {
    getNotificationLogsMock.mockReset();
  });

  it('allows Admin to view notification logs', async () => {
    getNotificationLogsMock.mockResolvedValue({
      data: [],
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
      url: '/api/v1/notifications/logs',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);

    await app.close();
  });

  it('denies BranchManagers from viewing notification logs', async () => {
    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'bm-id',
      sub: 'bm-id',
      role: 'BranchManager',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/logs',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(403);

    await app.close();
  });
});

