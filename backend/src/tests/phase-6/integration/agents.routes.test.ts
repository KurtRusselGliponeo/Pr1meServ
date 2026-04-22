import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const { getAgentProfileMock, updateAgentProfileMock, listAgentsMock, delistAgentMock } = vi.hoisted(() => ({
  getAgentProfileMock: vi.fn(),
  updateAgentProfileMock: vi.fn(),
  listAgentsMock: vi.fn(),
  delistAgentMock: vi.fn(),
}));

vi.mock('@/features/phase-4-agent-workbench/agents/agents.service', () => ({
  agentsService: {
    listAgents: listAgentsMock,
    getAgentProfile: getAgentProfileMock,
    updateAgentProfile: updateAgentProfileMock,
    delistAgent: delistAgentMock,
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

vi.mock('@/features/phase-5-performance/metrics/metrics.service', () => ({
  metricsService: {
    getPerformanceMetrics: vi.fn(),
    getLeaderboard: vi.fn(),
  },
}));

vi.mock('@/services/notifications.service', () => ({
  notificationsService: {
    getNotificationLogs: vi.fn(),
  },
}));

vi.mock('@/services/documents.service', () => ({
  documentsService: {
    generatePresignedUrl: vi.fn(),
    fetchDocuments: vi.fn(),
    getDocumentHistory: vi.fn(),
    updatePinnedState: vi.fn(),
    markCosafUploadComplete: vi.fn(),
  },
}));

vi.mock('@/services/cosaf-approvals.service', () => ({
  cosafApprovalsService: {
    listPendingApprovals: vi.fn(),
    approveReassignment: vi.fn(),
    rejectReassignment: vi.fn(),
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

vi.mock('@/shared/db/migrations/validation', () => ({
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
import { NotFoundError } from '@/lib/errors';

describe('agents.routes', () => {
  beforeEach(() => {
    listAgentsMock.mockReset();
    getAgentProfileMock.mockReset();
    updateAgentProfileMock.mockReset();
    delistAgentMock.mockReset();
  });

  it('lists agents for BranchManager lookups', async () => {
    listAgentsMock.mockResolvedValue({
      data: [
        {
          id: '7f5e658f-9b80-4c98-a7ca-53d08b2b4ad2',
          displayName: 'Agent Prime',
          agentCode: 'AG-001',
          email: 'agent@example.com',
          status: 'Active',
        },
      ],
    });

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'manager-id',
      sub: 'manager-id',
      role: 'BranchManager',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/agents?search=prime&limit=10',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data[0].agentCode).toBe('AG-001');

    await app.close();
  });

  it('returns an agent profile for authenticated users', async () => {
    getAgentProfileMock.mockResolvedValue({
      id: 'agent-id',
      userId: 'user-id',
      email: 'agent@example.com',
      firstName: 'Agent',
      lastName: 'Prime',
      displayName: 'Agent Prime',
      agentCode: 'AG-001',
      status: 'Active',
      role: 'Agent',
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
      auditTrail: [],
    });

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'manager-id',
      sub: 'manager-id',
      role: 'BranchManager',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/agents/7f5e658f-9b80-4c98-a7ca-53d08b2b4ad2',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().agentCode).toBe('AG-001');

    await app.close();
  });

  it('returns 404 when the agent profile does not exist', async () => {
    getAgentProfileMock.mockRejectedValue(new NotFoundError('Agent profile was not found.'));

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'manager-id',
      sub: 'manager-id',
      role: 'BranchManager',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/agents/7f5e658f-9b80-4c98-a7ca-53d08b2b4ad2',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('updates an agent profile', async () => {
    updateAgentProfileMock.mockResolvedValue({
      id: 'agent-id',
      userId: 'user-id',
      email: 'agent@example.com',
      firstName: 'Agent',
      lastName: 'Prime',
      displayName: 'Agent Prime',
      agentCode: 'AG-001',
      status: 'Active',
      role: 'Agent',
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
      auditTrail: [],
    });

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'manager-id',
      sub: 'manager-id',
      role: 'BranchManager',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/agents/7f5e658f-9b80-4c98-a7ca-53d08b2b4ad2',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        displayName: 'Agent Prime',
        firstName: 'Agent',
        lastName: 'Prime',
        email: 'agent@example.com',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().displayName).toBe('Agent Prime');

    await app.close();
  });

  it('returns 400 for invalid agent-profile updates', async () => {
    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'manager-id',
      sub: 'manager-id',
      role: 'BranchManager',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/agents/7f5e658f-9b80-4c98-a7ca-53d08b2b4ad2',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        displayName: '',
        firstName: 'A',
        lastName: 'B',
        email: 'invalid',
      },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('allows a BranchManager to delist an agent and orphan their portfolio', async () => {
    delistAgentMock.mockResolvedValue({
      targetAgentCode: 'AG-001',
      agentStatus: 'Terminated',
      orphanedClientProfiles: 12,
      migratedNapRecords: 48,
      migratedApeRecords: 17,
    });

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'manager-id',
      sub: 'manager-id',
      role: 'BranchManager',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/agents/delist',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        targetAgentCode: 'AG-001',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      targetAgentCode: 'AG-001',
      agentStatus: 'Terminated',
      orphanedClientProfiles: 12,
      migratedNapRecords: 48,
      migratedApeRecords: 17,
    });

    await app.close();
  });
});


