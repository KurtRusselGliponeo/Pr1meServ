export interface UserAccount {
  id: string;
  emailHash: string;
  encryptedEmail: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: 'Agent' | 'Admin';
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAtUtc?: string | Date | null;
}
