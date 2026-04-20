import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'test-encryption-key';

const { selectMock, updateWhereMock, updateSetMock, updateMock, withDbTransactionMock } =
  vi.hoisted(() => {
    const selectMock = vi.fn();
    const updateWhereMock = vi.fn().mockResolvedValue(undefined);
    const updateSetMock = vi.fn(() => ({
      where: updateWhereMock,
    }));
    const updateMock = vi.fn(() => ({
      set: updateSetMock,
    }));
    const withDbTransactionMock = vi.fn(
      async (_operationName: string, callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          update: updateMock,
        }),
    );

    return {
      selectMock,
      updateWhereMock,
      updateSetMock,
      updateMock,
      withDbTransactionMock,
    };
  });

vi.mock('@/db/client', () => ({
  db: {
    select: selectMock,
  },
  withDbTransaction: withDbTransactionMock,
}));

import { UnauthorizedError } from '@/lib/errors';
import { hashPassword } from '@/shared/lib/auth';
import { encryptEmail, hashEmail } from '@/shared/lib/encryption';
import { AuthService } from '@/features/identity/identity.service';

function createAuthSelectBuilder(result: unknown[]) {
  return {
    from: vi.fn(() => ({
      leftJoin: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue(result),
        })),
      })),
    })),
  };
}

describe('AuthService', () => {
  beforeEach(() => {
    selectMock.mockReset();
    updateMock.mockClear();
    updateSetMock.mockClear();
    updateWhereMock.mockClear();
    withDbTransactionMock.mockClear();
  });

  it('returns access and refresh tokens for valid credentials', async () => {
    const passwordHash = await hashPassword('password123');
    selectMock.mockReturnValueOnce(
      createAuthSelectBuilder([
        {
          userId: '1fadb46d-c5e8-40dc-b592-c8f063f0f84b',
          emailHash: hashEmail('agent@example.com'),
          encryptedEmail: encryptEmail('agent@example.com'),
          passwordHash,
          firstName: 'Agent',
          lastName: 'Prime',
          role: 'Agent',
          refreshTokenHash: null,
          refreshTokenExpiresAtUtc: null,
          agentId: 'f4e78db8-0584-4abc-8d38-a0b68cdef4fd',
          agentCode: 'AG-001',
          createdAtUtc: new Date('2026-01-01T00:00:00.000Z'),
          updatedAtUtc: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]),
    );

    const service = new AuthService();
    const result = await service.login('agent@example.com', 'password123');

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.user).toEqual({
      id: '1fadb46d-c5e8-40dc-b592-c8f063f0f84b',
      email: 'agent@example.com',
      firstName: 'Agent',
      lastName: 'Prime',
      role: 'Agent',
      agentCode: 'AG-001',
      createdAtUtc: '2026-01-01T00:00:00.000Z',
      updatedAtUtc: '2026-01-01T00:00:00.000Z',
    });
    expect(withDbTransactionMock).toHaveBeenCalled();
  });

  it('returns the same unauthorized message for an unknown email', async () => {
    selectMock.mockReturnValueOnce(createAuthSelectBuilder([]));

    const service = new AuthService();

    await expect(service.login('missing@example.com', 'password123')).rejects.toMatchObject({
      name: 'UnauthorizedError',
      message: 'Invalid email or password',
    });
  });

  it('returns the same unauthorized message for a wrong password', async () => {
    const passwordHash = await hashPassword('correct-password');
    selectMock.mockReturnValueOnce(
      createAuthSelectBuilder([
        {
          userId: '1fadb46d-c5e8-40dc-b592-c8f063f0f84b',
          emailHash: hashEmail('agent@example.com'),
          encryptedEmail: encryptEmail('agent@example.com'),
          passwordHash,
          firstName: 'Agent',
          lastName: 'Prime',
          role: 'Agent',
          refreshTokenHash: null,
          refreshTokenExpiresAtUtc: null,
          agentId: 'f4e78db8-0584-4abc-8d38-a0b68cdef4fd',
          agentCode: 'AG-001',
          createdAtUtc: new Date('2026-01-01T00:00:00.000Z'),
          updatedAtUtc: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]),
    );

    const service = new AuthService();

    await expect(service.login('agent@example.com', 'wrong-password')).rejects.toMatchObject({
      name: 'UnauthorizedError',
      message: 'Invalid email or password',
    });
  });

  it('returns unauthorized for an expired refresh token lookup', async () => {
    selectMock.mockReturnValueOnce(createAuthSelectBuilder([]));

    const service = new AuthService();

    await expect(service.refreshToken('expired-token')).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

