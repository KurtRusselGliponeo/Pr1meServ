import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const {
  getSummaryMock,
  listValidationIssuesMock,
  updateValidationIssueMock,
  listAuditFeedMock,
  listEntityAuditTimelineMock,
  exportCsvReportMock,
} = vi.hoisted(() => ({
  getSummaryMock: vi.fn(),
  listValidationIssuesMock: vi.fn(),
  updateValidationIssueMock: vi.fn(),
  listAuditFeedMock: vi.fn(),
  listEntityAuditTimelineMock: vi.fn(),
  exportCsvReportMock: vi.fn(),
}));

vi.mock('@/features/admin/data-center.service', () => ({
  adminDataCenterService: {
    getSummary: getSummaryMock,
    listValidationIssues: listValidationIssuesMock,
    updateValidationIssue: updateValidationIssueMock,
    listAuditFeed: listAuditFeedMock,
    listEntityAuditTimeline: listEntityAuditTimelineMock,
    exportCsvReport: exportCsvReportMock,
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

describe('data-center.routes', () => {
  beforeEach(() => {
    getSummaryMock.mockReset();
    listValidationIssuesMock.mockReset();
    updateValidationIssueMock.mockReset();
    listAuditFeedMock.mockReset();
    listEntityAuditTimelineMock.mockReset();
    exportCsvReportMock.mockReset();
  });

  it('supports validation issue lifecycle endpoints for admins only', async () => {
    listValidationIssuesMock.mockResolvedValue({ data: [], meta: { total: 0, page: 1, pageSize: 25, totalPages: 1, hasNextPage: false, hasPreviousPage: false } });
    updateValidationIssueMock.mockResolvedValue({ id: 'issue-id', status: 'Resolved' });

    const app = await buildApp();
    const adminToken = await tokenForRole(app, 'Admin');
    const agentToken = await tokenForRole(app, 'Agent');

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/data-center/validation-issues',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    const patchResponse = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/data-center/validation-issues/57b314ab-2e5f-4ab9-a1bc-1ea77a31cc78',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'Resolved' },
    });

    const blockedResponse = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/data-center/validation-issues/57b314ab-2e5f-4ab9-a1bc-1ea77a31cc78',
      headers: { authorization: `Bearer ${agentToken}` },
      payload: { status: 'Resolved' },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(patchResponse.statusCode).toBe(200);
    expect(blockedResponse.statusCode).toBe(403);
    await app.close();
  });

  it('returns csv exports and blocks nonexistent excel import routes', async () => {
    exportCsvReportMock.mockResolvedValue('header\nrow');

    const app = await buildApp();
    const branchManagerToken = await tokenForRole(app, 'BranchManager');

    const csvResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/data-center/reports/export?reportType=policy-list',
      headers: { authorization: `Bearer ${branchManagerToken}` },
    });

    const noExcelImportResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/data-center/reports/import-excel',
      headers: { authorization: `Bearer ${branchManagerToken}` },
    });

    expect(csvResponse.statusCode).toBe(200);
    expect(csvResponse.headers['content-type']).toContain('text/csv');
    expect(noExcelImportResponse.statusCode).toBe(404);
    await app.close();
  });
});
