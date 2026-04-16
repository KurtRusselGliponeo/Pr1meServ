'use client';

import { useQuery } from '@tanstack/react-query';
import { ListUsersQuerySchema, ListUsersResponseSchema } from '@a1prime/schemas';

import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/lib/query';
import type { ManagedUsersResponse } from '../types/user-management.types';

export function useGetUsers(page: number, roleFilter = '') {
  const query = useQuery({
    queryKey: queryKeys.users(String(page), roleFilter),
    queryFn: async () => {
      const params = ListUsersQuerySchema.parse({
        page,
        pageSize: 10,
        role: roleFilter || undefined,
      });
      const response = await api.get('/users', {
        params,
      });

      return ListUsersResponseSchema.parse(response.data) as ManagedUsersResponse;
    },
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error, 'Unable to load users.') : null,
  };
}
