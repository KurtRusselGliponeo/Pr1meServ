import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.REDIS_ENABLED = 'false';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const {
  fetchDocumentsMock,
  getDocumentHistoryMock,
  updatePinnedStateMock,
  markCosafUploadCompleteMock,
  getDownloadUrlMock,
  updateMetadataMock,
  archiveDocumentMock,
} = vi.hoisted(() => ({
  fetchDocumentsMock: vi.fn(),
  getDocumentHistoryMock: vi.fn(),
  updatePinnedStateMock: vi.fn(),
  markCosafUploadCompleteMock: vi.fn(),
  getDownloadUrlMock: vi.fn(),
  updateMetadataMock: vi.fn(),
  archiveDocumentMock: vi.fn(),
}));

vi.mock('@/features/phase-2-bm-workflow/documents/documents.service', () => ({
  documentsService: {
    fetchDocuments: fetchDocumentsMock,
    getDocumentHistory: getDocumentHistoryMock,
    updatePinnedState: updatePinnedStateMock,
    markCosafUploadComplete: markCosafUploadCompleteMock,
    getDownloadUrl: getDownloadUrlMock,
    updateMetadata: updateMetadataMock,
    archiveDocument: archiveDocumentMock,
    uploadDocument: vi.fn(),
    uploadClientDocument: vi.fn(),
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
    getAdminSystemLogs: vi.fn(),
    searchAgentsAndClients: vi.fn(),
    getAdminOverview: vi.fn(),
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
    fetchDocumentsMock.mockReset();
    getDocumentHistoryMock.mockReset();
    updatePinnedStateMock.mockReset();
    markCosafUploadCompleteMock.mockReset();
    getDownloadUrlMock.mockReset();
    updateMetadataMock.mockReset();
    archiveDocumentMock.mockReset();
  });

  it('allows authenticated Agents to read the document library', async () => {
    fetchDocumentsMock.mockResolvedValue({ data: [] });

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

  it('allows Admin to request a document download URL', async () => {
    getDownloadUrlMock.mockResolvedValue({
      downloadUrl: 'https://storage.local/download',
      expiresAtUtc: null,
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
      url: '/api/v1/documents/7f5e658f-9b80-4c98-a7ca-53d08b2b4ad2/download',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().downloadUrl).toContain('storage.local');

    await app.close();
  });
});
