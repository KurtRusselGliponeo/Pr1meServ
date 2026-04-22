import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const {
  listClientProfilesMock,
  importClientProfileMock,
  reassignClientProfilesMock,
  preflightReassignmentMock,
  listOrphanClientsMock,
} = vi.hoisted(() => ({
  listClientProfilesMock: vi.fn(),
  importClientProfileMock: vi.fn(),
  reassignClientProfilesMock: vi.fn(),
  preflightReassignmentMock: vi.fn(),
  listOrphanClientsMock: vi.fn(),
}));

vi.mock('@/features/phase-3-reassignment/client-profiles/client-profiles.service', () => ({
  clientProfilesService: {
    listOrphanClients: listOrphanClientsMock,
    listClientProfiles: listClientProfilesMock,
    importClientProfile: importClientProfileMock,
    preflightReassignment: preflightReassignmentMock,
    reassignClientProfiles: reassignClientProfilesMock,
  },
}));

vi.mock('@/features/identity/identity.service', () => ({
  authService: {
    login: vi.fn(),
    refreshToken: vi.fn(),
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

import { ListClientProfilesResponseSchema } from '@a1prime/schemas';
import buildApp from '@/app';

describe('client-profiles.routes', () => {
  function buildMultipartBody(
    boundary: string,
    fileName: string,
    mimeType: string,
    content: string,
  ) {
    return [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
      `Content-Type: ${mimeType}`,
      '',
      content,
      `--${boundary}--`,
      '',
    ].join('\r\n');
  }

  beforeEach(() => {
    listClientProfilesMock.mockReset();
    importClientProfileMock.mockReset();
    preflightReassignmentMock.mockReset();
    reassignClientProfilesMock.mockReset();
    listOrphanClientsMock.mockReset();
  });

  it('returns orphan-pool clients for BranchManager review', async () => {
    listOrphanClientsMock.mockResolvedValue({
      data: [
        {
          id: '3a3b00ff-bbdf-4a76-b0c1-9a222fce0db8',
          assignedAgentId: null,
          firstName: 'Ava',
          lastName: 'Santos',
          policyNumber: 'POL-101',
          modalPremium: '1200.0000',
          api: '14000.0000',
          sumAssured: '450000.0000',
          commissionAmount: '1500.0000',
          caseStatus: 'Orphan',
          policyStatus: 'Active',
          createdAtUtc: new Date().toISOString(),
          updatedAtUtc: new Date().toISOString(),
        },
      ],
      meta: {
        total: 1,
      },
    });

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'manager-user-id',
      sub: 'manager-user-id',
      role: 'BranchManager',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/clients/orphans',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().meta.total).toBe(1);
    expect(response.json().data[0].caseStatus).toBe('Orphan');

    await app.close();
  });

  it('returns reassignment preflight results for a BranchManager token', async () => {
    preflightReassignmentMock.mockResolvedValue({
      ok: true,
      sourceAgentId: 'de6beb8c-7781-43dd-b28f-3d5a07f489dc',
      destinationAgentId: 'b13df722-f7f2-4061-b2f4-572346f3d90b',
      totalRequested: 1,
      validClientProfileIds: ['3a3b00ff-bbdf-4a76-b0c1-9a222fce0db8'],
      issues: [],
    });

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'manager-user-id',
      sub: 'manager-user-id',
      role: 'BranchManager',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/client-profiles/reassign/preflight',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        sourceAgentId: 'de6beb8c-7781-43dd-b28f-3d5a07f489dc',
        destinationAgentId: 'b13df722-f7f2-4061-b2f4-572346f3d90b',
        clientProfileIds: ['3a3b00ff-bbdf-4a76-b0c1-9a222fce0db8'],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().ok).toBe(true);

    await app.close();
  });

  it('returns a paginated list scoped for an Agent token', async () => {
    listClientProfilesMock.mockResolvedValue({
      data: [],
      meta: {
        total: 0,
        page: 1,
        pageSize: 25,
        hasNextPage: false,
      },
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
      method: 'GET',
      url: '/api/v1/client-profiles?page=1&pageSize=25',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(ListClientProfilesResponseSchema.parse(response.json())).toBeTruthy();

    await app.close();
  });

  it('returns a paginated list for a BranchManager token with agentId filter', async () => {
    listClientProfilesMock.mockResolvedValue({
      data: [],
      meta: {
        total: 0,
        page: 1,
        pageSize: 25,
        hasNextPage: false,
      },
    });

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'manager-user-id',
      sub: 'manager-user-id',
      role: 'BranchManager',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/client-profiles?page=1&pageSize=25&agentId=de6beb8c-7781-43dd-b28f-3d5a07f489dc',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);

    await app.close();
  });

  it('returns 400 for pageSize values over 100', async () => {
    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'manager-user-id',
      sub: 'manager-user-id',
      role: 'BranchManager',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/client-profiles?pageSize=200',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('returns 401 when no token is provided', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/client-profiles',
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('returns 403 for a token with an invalid role', async () => {
    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'invalid-user-id',
      sub: 'invalid-user-id',
      role: 'UnknownRole',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    } as never);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/client-profiles',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(403);

    await app.close();
  });

  it('allows a BranchManager to submit a reassignment batch', async () => {
    reassignClientProfilesMock.mockResolvedValue({
      reassignedCount: 2,
    });

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'manager-user-id',
      sub: 'manager-user-id',
      role: 'BranchManager',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/client-profiles/reassign',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        sourceAgentId: 'de6beb8c-7781-43dd-b28f-3d5a07f489dc',
        destinationAgentId: 'b13df722-f7f2-4061-b2f4-572346f3d90b',
        clientProfileIds: ['3a3b00ff-bbdf-4a76-b0c1-9a222fce0db8'],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ reassignedCount: 2 });

    await app.close();
  });

  it('accepts a valid import upload for a BranchManager token', async () => {
    importClientProfileMock.mockResolvedValue({
      objectKey: 'client-profiles/imports/file.pdf',
      fileName: 'import.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      signedUrl: 'https://example.com/file.pdf',
      expiresAtUtc: new Date().toISOString(),
    });

    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'manager-user-id',
      sub: 'manager-user-id',
      role: 'BranchManager',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });
    const boundary = 'test-boundary';

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/client-profiles/import',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: buildMultipartBody(boundary, 'import.pdf', 'application/pdf', 'fake-pdf-content'),
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().fileName).toBe('import.pdf');

    await app.close();
  });

  it('returns 422 when import is called without a file', async () => {
    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'manager-user-id',
      sub: 'manager-user-id',
      role: 'BranchManager',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/client-profiles/import',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(422);

    await app.close();
  });

  it('returns 400 when import file metadata is invalid', async () => {
    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'manager-user-id',
      sub: 'manager-user-id',
      role: 'BranchManager',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });
    const boundary = 'bad-boundary';

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/client-profiles/import',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: buildMultipartBody(boundary, '', 'text/plain', 'bad-content'),
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('returns 403 when an Agent calls the import endpoint', async () => {
    const app = await buildApp();
    const token = await app.jwt.sign({
      id: 'agent-user-id',
      sub: 'agent-user-id',
      role: 'Agent',
      agentId: 'agent-id',
      agentCode: 'AG-001',
      tokenType: 'access',
    });
    const boundary = 'forbidden-boundary';

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/client-profiles/import',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: buildMultipartBody(boundary, 'import.pdf', 'application/pdf', 'fake-pdf-content'),
    });

    expect(response.statusCode).toBe(403);

    await app.close();
  });
});


