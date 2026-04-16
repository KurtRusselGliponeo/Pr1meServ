'use client';

import { useQuery } from '@tanstack/react-query';

import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/lib/query';
import type { ManagedUsersResponse } from '../types/user-management.types';

function normalizeUsersResponse(data: any): ManagedUsersResponse {
  return {
    data: Array.isArray(data.data)
      ? data.data.map((user: any) => ({
          id: user.id,
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          email: user.email ?? user.encryptedEmail ?? '',
          role: user.role,
          createdAtUtc: user.createdAtUtc ?? user.createdAt ?? new Date().toISOString(),
          updatedAtUtc: user.updatedAtUtc ?? user.updatedAt ?? new Date().toISOString(),
          deletedAtUtc: user.deletedAtUtc ?? null,
        }))
      : [],
    meta: {
      total: Number(data.meta?.total ?? 0),
      page: Number(data.meta?.page ?? 1),
      pageSize: Number(data.meta?.pageSize ?? 10),
      hasNextPage: Boolean(data.meta?.hasNextPage),
    },
  };
}

export function useGetUsers(page: number, roleFilter = '') {
  const query = useQuery({
    queryKey: queryKeys.users(String(page), roleFilter),
    queryFn: async () => {
      const response = await api.get('/users', {
        params: {
          page,
          pageSize: 10,
          role: roleFilter || undefined,
        },
      });

      return normalizeUsersResponse(response.data);
    },
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error, 'Unable to load users.') : null,
  };
}
