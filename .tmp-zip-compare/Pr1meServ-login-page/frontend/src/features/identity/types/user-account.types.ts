import type { SystemRole } from '@a1prime/schemas';

export interface UserAccount {
  id: string;
  emailHash: string;
  encryptedEmail: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: SystemRole;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAtUtc?: string | Date | null;
}
