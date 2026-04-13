import { IdentityService } from './identity.service';
import { encryptEmail, hashEmail } from '../../shared/lib/encryption';

describe('IdentityService', () => {
  const mockUser = {
    id: 'user-1',
    emailHash: hashEmail('test@example.com'),
    encryptedEmail: '',
    passwordHash: '',
    firstName: 'John',
    lastName: 'Doe',
    role: 'Admin',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAtUtc: null,
  };

  it('registers a user through the repository abstraction', async () => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key';

    const createUser = jest.fn().mockResolvedValue({
      ...mockUser,
      encryptedEmail: encryptEmail('test@example.com'),
      passwordHash: '$2a$12$abcdefghijklmnopqrstuv',
    });

    const service = new IdentityService(
      {
        findByEmailHash: jest.fn().mockResolvedValue(null),
        findById: jest.fn().mockResolvedValue(mockUser),
        createUser,
      },
      jest.fn().mockResolvedValue(undefined),
    );

    const app = {
      jwt: {
        sign: jest.fn().mockResolvedValue('signed-token'),
      },
    } as any;

    const result = await service.registerUser(app, {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      role: 'Admin',
    });

    expect(createUser).toHaveBeenCalled();
    expect(result.tokens.accessToken).toBe('signed-token');
    expect(result.tokens.refreshToken).toBe('signed-token');
  });
});
