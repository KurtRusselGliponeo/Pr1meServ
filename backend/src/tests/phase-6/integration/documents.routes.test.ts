import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const {
  generatePresignedUrlMock,
  fetchDocumentsMock,
  getDocumentHistoryMock,
  updatePinnedStateMock,
  markCosafUploadCompleteMock,
} = vi.hoisted(() => ({
  generatePresignedUrlMock: vi.fn(),
  fetchDocumentsMock: vi.fn(),
  getDocumentHistoryMock: vi.fn(),
  updatePinnedStateMock: vi.fn(),
  markCosafUploadCompleteMock: vi.fn(),
}));

vi.mock('@/features/phase-2-bm-workflow/documents/documents.service', () => ({
  documentsService: {
    generatePresignedUrl: generatePresignedUrlMock,
    fetchDocuments: fetchDocumentsMock,
    getDocumentHistory: getDocumentHistoryMock,
    updatePinnedState: updatePinnedStateMock,
    markCosafUploadComplete: markCosafUploadCompleteMock,
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
    updateUser: vi.fn(),
    restoreUser: vi.fn(),
    resetPassword: vi.fn(),
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
    getLeaderboard: vi.fn(),
  },
}));

vi.mock('@/features/notifications/notifications.service', () => ({
  notificationsService: {
    getNotificationLogs: vi.fn(),
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

describe('documents.routes', () => {
  beforeEach(() => {
    generatePresignedUrlMock.mockReset();
    fetchDocumentsMock.mockReset();
    getDocumentHistoryMock.mockReset();
    updatePinnedStateMock.mockReset();
    markCosafUploadCompleteMock.mockReset();
  });

  it(
    'allows Admin to request a presigned upload URL',
    async () => {
      generatePresignedUrlMock.mockResolvedValue({
        signedUrl: 'https://storage.local/upload',
        documentId: '7f5e658f-9b80-4c98-a7ca-53d08b2b4ad2',
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
      url: '/api/v1/documents/presigned-url',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        fileName: 'cosaf.pdf',
        mimeType: 'application/pdf',
        category: 'COSAF',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().documentId).toBe('7f5e658f-9b80-4c98-a7ca-53d08b2b4ad2');

      await app.close();
    },
    15000,
  );

  it('denies Agents from requesting a presigned upload URL', async () => {
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
      method: 'POST',
      url: '/api/v1/documents/presigned-url',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        fileName: 'cosaf.pdf',
        mimeType: 'application/pdf',
        category: 'COSAF',
      },
    });

    expect(response.statusCode).toBe(403);

    await app.close();
  });

  it('allows authenticated Agents to read the document library', async () => {
    fetchDocumentsMock.mockResolvedValue([]);

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
      url: '/api/v1/documents',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);

    await app.close();
  });

  it('denies Agents from updating pinned state', async () => {
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
      method: 'PATCH',
      url: '/api/v1/documents/7f5e658f-9b80-4c98-a7ca-53d08b2b4ad2/pin',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        isPinned: true,
      },
    });

    expect(response.statusCode).toBe(403);

    await app.close();
  });
});


