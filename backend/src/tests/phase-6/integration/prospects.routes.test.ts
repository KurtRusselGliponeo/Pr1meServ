import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const {
  listProspectsMock,
  createProspectMock,
  updateProspectStageMock,
  updateProspectMock,
} = vi.hoisted(() => ({
  listProspectsMock: vi.fn(),
  createProspectMock: vi.fn(),
  updateProspectStageMock: vi.fn(),
  updateProspectMock: vi.fn(),
}));

vi.mock('@/features/phase-4-agent-workbench/prospects/prospects.service', () => ({
  prospectsService: {
    listProspects: listProspectsMock,
    createProspect: createProspectMock,
    updateProspectStage: updateProspectStageMock,
    updateProspect: updateProspectMock,
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

describe('prospects.routes', () => {
  beforeEach(() => {
    listProspectsMock.mockReset();
    createProspectMock.mockReset();
    updateProspectStageMock.mockReset();
    updateProspectMock.mockReset();
  });

  it('returns prospects for an Agent token', async () => {
    listProspectsMock.mockResolvedValue({ data: [] });
    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'agent-user-id',
      sub: 'agent-user-id',
      role: 'Agent',
      agentId: 'agent-profile-id',
      agentCode: 'AG-001',
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/prospects',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(listProspectsMock).toHaveBeenCalledOnce();
    await app.close();
  });

  it('allows BranchManager to create a prospect', async () => {
    createProspectMock.mockResolvedValue({
      id: '811a52dc-b7ca-47ae-9239-e16ea6d4c2bc',
      agentCode: 'AG-001',
      branchCode: 'BR-01',
      clientName: 'Jamie Prospect',
      contactNumber: '09171234567',
      email: 'jamie@example.com',
      temperature: 'Warm',
      pipelineStage: 'Contacted',
      notes: 'Schedule proposal review.',
      followUpDateUtc: new Date().toISOString(),
      lastContactedAtUtc: null,
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
    });
    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'manager-user-id',
      sub: 'manager-user-id',
      role: 'BranchManager',
      agentId: 'branch-manager-agent-id',
      agentCode: 'BM-001',
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/prospects',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        agentCode: 'AG-001',
        clientName: 'Jamie Prospect',
        contactNumber: '09171234567',
        email: 'jamie@example.com',
        temperature: 'Warm',
        pipelineStage: 'Contacted',
        notes: 'Schedule proposal review.',
        followUpDateUtc: new Date().toISOString(),
      },
    });

    expect(response.statusCode).toBe(201);
    expect(createProspectMock).toHaveBeenCalledOnce();
    await app.close();
  });

  it('allows stage movement for authorized users', async () => {
    updateProspectStageMock.mockResolvedValue({
      id: '811a52dc-b7ca-47ae-9239-e16ea6d4c2bc',
      agentCode: 'AG-001',
      branchCode: 'BR-01',
      clientName: 'Jamie Prospect',
      contactNumber: '09171234567',
      email: null,
      temperature: 'Warm',
      pipelineStage: 'Approved',
      notes: null,
      followUpDateUtc: null,
      lastContactedAtUtc: null,
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
    });
    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'agent-user-id',
      sub: 'agent-user-id',
      role: 'Agent',
      agentId: 'agent-profile-id',
      agentCode: 'AG-001',
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/prospects/811a52dc-b7ca-47ae-9239-e16ea6d4c2bc/stage',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        pipelineStage: 'Approved',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(updateProspectStageMock).toHaveBeenCalledOnce();
    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/prospects',
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });
});
