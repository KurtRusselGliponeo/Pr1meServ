import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import request from 'supertest';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const {
  importQueueAddMock,
  createLoggedWorkerMock,
  loggerErrorMock,
  loggerMock,
} = vi.hoisted(() => {
  const loggerErrorMock = vi.fn();
  const loggerMock = {
    info: vi.fn(),
    warn: vi.fn(),
    error: loggerErrorMock,
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(),
  };
  loggerMock.child.mockReturnValue(loggerMock);

  return {
    importQueueAddMock: vi.fn().mockResolvedValue(undefined),
    createLoggedWorkerMock: vi.fn(),
    loggerErrorMock,
    loggerMock,
  };
});

vi.mock('@/features/phase-5-performance/lapsation/lapsation.service', () => ({
  lapsationService: {
    getDashboard: vi.fn(),
    reinstateRecord: vi.fn(),
  },
}));

vi.mock('@/queues/import.queue', async () => {
  const actual = await vi.importActual<typeof import('@/queues/import.queue')>('@/queues/import.queue');

  return {
    ...actual,
    createImportQueue: () => ({
      queue: {},
      add: importQueueAddMock,
    }),
  };
});

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
  withDbTransaction: vi.fn(),
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

vi.mock('@/shared/lib/queue', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/queue')>('@/shared/lib/queue');
  return {
    ...actual,
    createLoggedWorker: createLoggedWorkerMock,
  };
});

vi.mock('@/lib/logger', () => ({
  logger: loggerMock,
}));

import buildApp from '@/app';
import { createImportWorker } from '@/jobs/import.worker';
import { importQueueDefinition } from '@/queues/import.queue';

function createWorkbookBuffer(rows: Array<Record<string, string | number>>) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Lapsation');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function buildMultipartBody(boundary: string, fileName: string, mimeType: string, content: Buffer) {
  const head = Buffer.from(
    [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
      `Content-Type: ${mimeType}`,
      '',
      '',
    ].join('\r\n'),
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return Buffer.concat([head, content, tail]);
}

describe('lapsation upload integration', () => {
  beforeEach(() => {
    importQueueAddMock.mockReset();
    importQueueAddMock.mockResolvedValue(undefined);
    createLoggedWorkerMock.mockReset();
    loggerErrorMock.mockReset();
  });

  it('accepts a valid minimal xlsx upload and enqueues a lapsation import job', async () => {
    const workbookBuffer = createWorkbookBuffer([
      {
        'Agent ID': '11111111-1111-1111-1111-111111111111',
        'Record Month': '2026-04',
        'Modal Premium': 100,
        API: 200,
        'Sum Assured': 300,
        'Commission Amount': 25,
        'Policy Number': '22222222-2222-2222-2222-222222222222',
        'Transaction Type': 'LAPSE',
        'Credit Status': 'DEBIT',
      },
    ]);

    const app = await buildApp();
    await app.ready();
    const token = await app.jwt.sign({
      id: 'manager-user-id',
      sub: '33333333-3333-3333-3333-333333333333',
      role: 'BranchManager',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await request(app.server)
      .post('/api/v1/lapsation/import')
      .set('authorization', `Bearer ${token}`)
      .set('content-type', 'multipart/form-data; boundary=lapsation-boundary')
      .send(
        buildMultipartBody(
        'lapsation-boundary',
        'lapsation.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        workbookBuffer,
        ),
      );

    expect(response.statusCode).toBe(202);
    expect(importQueueAddMock).toHaveBeenCalledOnce();
    expect(importQueueAddMock.mock.calls[0]?.[0]).toBe('process-lapsation-upload');
    expect(importQueueAddMock.mock.calls[0]?.[1]).toMatchObject({
      fileName: 'lapsation.xlsx',
      initiatedByUserId: '33333333-3333-3333-3333-333333333333',
    });

    await app.close();
  });

  it('rejects a corrupted .xlsx upload with a 400 and keeps the server responsive', async () => {
    const app = await buildApp();
    await app.ready();
    const token = await app.jwt.sign({
      id: 'manager-user-id',
      sub: '33333333-3333-3333-3333-333333333333',
      role: 'BranchManager',
      agentId: null,
      agentCode: null,
      tokenType: 'access',
    });

    const response = await request(app.server)
      .post('/api/v1/lapsation/import')
      .set('authorization', `Bearer ${token}`)
      .set('content-type', 'multipart/form-data; boundary=corrupt-boundary')
      .send(
        buildMultipartBody(
        'corrupt-boundary',
        'lapsation.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        Buffer.from('this is not an excel file', 'utf8'),
        ),
      );

    expect(response.statusCode).toBe(400);
    expect(importQueueAddMock).not.toHaveBeenCalled();

    const healthResponse = (await request(app.server).get('/health')) as unknown as {
      statusCode: number;
    };

    expect(healthResponse.statusCode).toBe(200);

    await app.close();
  });

  it('fails malformed workbook jobs gracefully, logs the validation error, and keeps retries bounded', async () => {
    const malformedWorkbookBuffer = createWorkbookBuffer([
      {
        'Agent ID': '11111111-1111-1111-1111-111111111111',
        'Record Month': '2026-04',
        'Modal Premium': 100,
        API: 200,
        'Sum Assured': 300,
        'Commission Amount': 25,
        'Transaction Type': 'LAPSE',
        'Credit Status': 'DEBIT',
      },
    ]);

    let capturedProcessor:
      | ((job: { id: string; name: string; data: Record<string, unknown> }) => Promise<void>)
      | undefined;

    createLoggedWorkerMock.mockImplementation((_definition, processor) => {
      capturedProcessor = processor;
      return {
        on: vi.fn(),
      };
    });

    createImportWorker();

    await expect(
      capturedProcessor?.({
        id: 'job-1',
        name: 'process-lapsation-upload',
        data: {
          importBatchId: 'batch-1',
          fileName: 'lapsation.xlsx',
          initiatedByUserId: '33333333-3333-3333-3333-333333333333',
          workbookBase64: malformedWorkbookBuffer.toString('base64'),
        },
      }),
    ).rejects.toThrow(/missing required headers/i);

    expect(loggerErrorMock).toHaveBeenCalled();
    expect(importQueueDefinition.defaultJobOptions?.attempts).toBe(3);
  });
});
