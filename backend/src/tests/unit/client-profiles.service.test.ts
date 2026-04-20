import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ListClientProfilesQuerySchema } from '@a1prime/schemas';
import type { AuthTokenPayload } from '@/shared/lib/auth';
import { BusinessRuleError, NotFoundError } from '@/lib/errors';
import { ClientProfilesService } from '@/features/client-profiles/client-profiles.service';

const {
  selectMock,
  transactionMock,
  txSelectMock,
  txUpdateMock,
  txInsertMock,
  fileTypeFromBufferMock,
  uploadPrivateObjectMock,
  getSignedObjectUrlMock,
} = vi.hoisted(() => {
  const selectMock = vi.fn();
  const txSelectMock = vi.fn();
  const txUpdateWhereMock = vi.fn().mockResolvedValue(undefined);
  const txUpdateSetMock = vi.fn(() => ({
    where: txUpdateWhereMock,
  }));
  const txUpdateMock = vi.fn(() => ({
    set: txUpdateSetMock,
  }));
  const txInsertValuesMock = vi.fn().mockResolvedValue(undefined);
  const txInsertMock = vi.fn(() => ({
    values: txInsertValuesMock,
  }));
  const transactionMock = vi.fn(
    async (
      callback: (tx: {
        select: typeof txSelectMock;
        update: typeof txUpdateMock;
        insert: typeof txInsertMock;
      }) => Promise<unknown>,
    ) =>
      callback({
        select: txSelectMock,
        update: txUpdateMock,
        insert: txInsertMock,
      }),
  );

  return {
    selectMock,
    transactionMock,
    txSelectMock,
    txUpdateMock,
    txInsertMock,
    fileTypeFromBufferMock: vi.fn(),
    uploadPrivateObjectMock: vi.fn().mockResolvedValue({
      bucket: 'private-bucket',
      key: 'client-profiles/imports/file.pdf',
    }),
    getSignedObjectUrlMock: vi.fn().mockResolvedValue('https://example.com/signed'),
  };
});

vi.mock('@/db/client', () => ({
  db: {
    select: selectMock,
    transaction: transactionMock,
  },
  withDbTransaction: async (
    _operationName: string,
    callback: Parameters<typeof transactionMock>[0],
  ) => transactionMock(callback),
}));

vi.mock('file-type', () => ({
  fileTypeFromBuffer: fileTypeFromBufferMock,
}));

vi.mock('@/lib/r2', () => ({
  r2Service: {
    uploadPrivateObject: uploadPrivateObjectMock,
    getSignedObjectUrl: getSignedObjectUrlMock,
  },
}));

vi.mock('@/features/notifications/email-queue.service', () => ({
  emailQueueService: {
    enqueueEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/shared/lib/encryption', () => ({
  decryptEmail: vi.fn(() => 'agent@example.com'),
}));

function createRowsBuilder(result: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => ({
          offset: vi.fn().mockResolvedValue(result),
        })),
      })),
    })),
  };
}

function createCountBuilder(total: number) {
  return {
    from: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([{ total }]),
    })),
  };
}

function createTxAgentBuilder(result: unknown[]) {
  return {
    from: vi.fn(() => ({
      innerJoin: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue(result),
        })),
      })),
      where: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue(result),
      })),
    })),
  };
}

function createTxClientProfilesBuilder(result: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn().mockResolvedValue(result),
    })),
  };
}

function createMultipartFile(
  filename: string,
  chunks: Buffer[],
): { filename: string; file: AsyncIterable<Buffer> } {
  return {
    filename,
    file: {
      async *[Symbol.asyncIterator]() {
        for (const chunk of chunks) {
          yield chunk;
        }
      },
    },
  };
}

const baseActorUser: AuthTokenPayload = {
  id: '88c9956a-064c-436a-b267-7d5f7a434197',
  sub: '88c9956a-064c-436a-b267-7d5f7a434197',
  role: 'Agent',
  agentId: 'fc944343-2336-4951-b299-9d7203362cc8',
  agentCode: 'AG-001',
  tokenType: 'access',
};

describe('ClientProfilesService', () => {
  beforeEach(() => {
    selectMock.mockReset();
    transactionMock.mockClear();
    txSelectMock.mockReset();
    txUpdateMock.mockClear();
    txInsertMock.mockClear();
    fileTypeFromBufferMock.mockReset();
    uploadPrivateObjectMock.mockClear();
    getSignedObjectUrlMock.mockClear();
  });

  it('returns only the agent-scoped client data for an Agent token', async () => {
    selectMock
      .mockReturnValueOnce(
        createRowsBuilder([
          {
            id: '53e2d073-c2f4-4509-8064-dfbf9f163159',
            assignedAgentId: baseActorUser.agentId,
            firstName: 'Ana',
            lastName: 'Santos',
            policyNumber: 'POL-001',
            modalPremium: '1000.0000',
            api: '12000.0000',
            sumAssured: '500000.0000',
            commissionAmount: '1500.0000',
            caseStatus: 'Contacted',
            policyStatus: 'Active',
            createdAtUtc: new Date('2026-01-01T00:00:00.000Z'),
            updatedAtUtc: new Date('2026-01-02T00:00:00.000Z'),
          },
        ]),
      )
      .mockReturnValueOnce(createCountBuilder(1));

    const service = new ClientProfilesService();
    const result = await service.listClientProfiles(
      ListClientProfilesQuerySchema.parse({ page: 1, pageSize: 25 }),
      baseActorUser,
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.assignedAgentId).toBe(baseActorUser.agentId);
    expect(result.meta).toEqual({
      total: 1,
      page: 1,
      pageSize: 25,
      hasNextPage: false,
    });
  });

  it('uploads a valid client profile import file to R2', async () => {
    fileTypeFromBufferMock.mockResolvedValue({
      ext: 'pdf',
      mime: 'application/pdf',
    });

    const service = new ClientProfilesService();
    const result = await service.importClientProfile(
      createMultipartFile('policy.pdf', [Buffer.from('%PDF-1.4 sample')]) as never,
    );

    expect(uploadPrivateObjectMock).toHaveBeenCalledOnce();
    expect(getSignedObjectUrlMock).toHaveBeenCalledWith(expect.any(String), 900);
    expect(result.fileName).toBe('policy.pdf');
    expect(result.mimeType).toBe('application/pdf');
  });

  it('rejects a disguised executable upload with 422 semantics', async () => {
    fileTypeFromBufferMock.mockResolvedValue({
      ext: 'exe',
      mime: 'application/x-msdownload',
    });

    const service = new ClientProfilesService();

    await expect(
      service.importClientProfile(
        createMultipartFile('avatar.png', [Buffer.from('MZ fake executable')]) as never,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('rejects import files larger than 20MB', async () => {
    const oversizedBuffer = Buffer.alloc(20 * 1024 * 1024 + 1, 1);
    const service = new ClientProfilesService();

    await expect(
      service.importClientProfile(createMultipartFile('large.pdf', [oversizedBuffer]) as never),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('surfaces an R2 upload failure for import processing', async () => {
    fileTypeFromBufferMock.mockResolvedValue({
      ext: 'png',
      mime: 'image/png',
    });
    uploadPrivateObjectMock.mockRejectedValueOnce(new Error('R2 unavailable'));

    const service = new ClientProfilesService();

    await expect(
      service.importClientProfile(createMultipartFile('image.png', [Buffer.from([0x89])]) as never),
    ).rejects.toThrow('R2 unavailable');
  });

  it('reassigns all requested client profiles in one transaction', async () => {
    txSelectMock
      .mockReturnValueOnce(createTxAgentBuilder([{ id: '10b9407f-c35f-4c6a-9f84-c6cb74197d9d' }]))
      .mockReturnValueOnce(createTxAgentBuilder([{ id: 'a39106e2-d93b-4d26-a230-cfd529e77a19' }]))
      .mockReturnValueOnce(
        createTxClientProfilesBuilder([
          {
            id: '53e2d073-c2f4-4509-8064-dfbf9f163159',
            assignedAgentId: '10b9407f-c35f-4c6a-9f84-c6cb74197d9d',
          },
          {
            id: 'a8b3f7bd-54ce-4b9c-98c2-457278c2c7de',
            assignedAgentId: '10b9407f-c35f-4c6a-9f84-c6cb74197d9d',
          },
        ]),
      );

    const service = new ClientProfilesService();
    const result = await service.reassignClientProfiles(
      {
        sourceAgentId: '10b9407f-c35f-4c6a-9f84-c6cb74197d9d',
        destinationAgentId: 'a39106e2-d93b-4d26-a230-cfd529e77a19',
        clientProfileIds: [
          '53e2d073-c2f4-4509-8064-dfbf9f163159',
          'a8b3f7bd-54ce-4b9c-98c2-457278c2c7de',
        ],
      },
      {
        ...baseActorUser,
        role: 'BranchManager',
        agentId: null,
        agentCode: null,
      },
    );

    expect(transactionMock).toHaveBeenCalledOnce();
    expect(txUpdateMock).toHaveBeenCalledOnce();
    expect(txInsertMock).toHaveBeenCalledOnce();
    expect(result).toEqual({ reassignedCount: 2 });
  });

  it('throws when the source agent does not exist', async () => {
    txSelectMock
      .mockReturnValueOnce(createTxAgentBuilder([]))
      .mockReturnValueOnce(createTxAgentBuilder([{ id: 'a39106e2-d93b-4d26-a230-cfd529e77a19' }]));

    const service = new ClientProfilesService();

    await expect(
      service.reassignClientProfiles(
        {
          sourceAgentId: '10b9407f-c35f-4c6a-9f84-c6cb74197d9d',
          destinationAgentId: 'a39106e2-d93b-4d26-a230-cfd529e77a19',
          clientProfileIds: ['53e2d073-c2f4-4509-8064-dfbf9f163159'],
        },
        {
          ...baseActorUser,
          role: 'Admin',
          agentId: null,
          agentCode: null,
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws when the destination agent does not exist', async () => {
    txSelectMock
      .mockReturnValueOnce(createTxAgentBuilder([{ id: '10b9407f-c35f-4c6a-9f84-c6cb74197d9d' }]))
      .mockReturnValueOnce(createTxAgentBuilder([]));

    const service = new ClientProfilesService();

    await expect(
      service.reassignClientProfiles(
        {
          sourceAgentId: '10b9407f-c35f-4c6a-9f84-c6cb74197d9d',
          destinationAgentId: 'a39106e2-d93b-4d26-a230-cfd529e77a19',
          clientProfileIds: ['53e2d073-c2f4-4509-8064-dfbf9f163159'],
        },
        {
          ...baseActorUser,
          role: 'Admin',
          agentId: null,
          agentCode: null,
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rolls back the reassignment transaction when a downstream write fails', async () => {
    txSelectMock
      .mockReturnValueOnce(createTxAgentBuilder([{ id: '10b9407f-c35f-4c6a-9f84-c6cb74197d9d' }]))
      .mockReturnValueOnce(createTxAgentBuilder([{ id: 'a39106e2-d93b-4d26-a230-cfd529e77a19' }]))
      .mockReturnValueOnce(
        createTxClientProfilesBuilder([
          {
            id: '53e2d073-c2f4-4509-8064-dfbf9f163159',
            assignedAgentId: '10b9407f-c35f-4c6a-9f84-c6cb74197d9d',
          },
        ]),
      );
    txInsertMock.mockReturnValueOnce({
      values: vi.fn().mockRejectedValue(new Error('audit insert failed')),
    });

    const service = new ClientProfilesService();

    await expect(
      service.reassignClientProfiles(
        {
          sourceAgentId: '10b9407f-c35f-4c6a-9f84-c6cb74197d9d',
          destinationAgentId: 'a39106e2-d93b-4d26-a230-cfd529e77a19',
          clientProfileIds: ['53e2d073-c2f4-4509-8064-dfbf9f163159'],
        },
        {
          ...baseActorUser,
          role: 'BranchManager',
          agentId: null,
          agentCode: null,
        },
      ),
    ).rejects.toThrow('audit insert failed');
  });
});

