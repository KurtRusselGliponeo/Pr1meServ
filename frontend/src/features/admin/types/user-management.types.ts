import type { SystemRole } from '@a1prime/schemas';

export interface ManagedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: SystemRole;
  createdAtUtc: string;
  updatedAtUtc: string;
  deletedAtUtc: string | null;
}

export interface ManagedUsersResponse {
  data: ManagedUser[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    hasNextPage: boolean;
  };
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: SystemRole;
}
