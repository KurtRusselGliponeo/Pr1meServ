'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ListClientProfilesQuerySchema, ListClientProfilesResponseSchema } from '@a1prime/schemas';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';

export interface ClientProfilesFilters {
  status?: string;
  agentId?: string;
  search?: string;
}

export function useGetClientProfiles(
  page: number,
  filters: ClientProfilesFilters,
  pageSize = 10,
  enabled = true,
) {
  const validStatuses = [
    'Uncontacted',
    'Contacted',
    'For Approval',
    'Forms Submitted',
    'BM Signed',
    'Done',
    'Returned',
    'Orphan',
  ];
  const normalizedSearch = filters.search?.trim() || undefined;
  const parsedQuery = ListClientProfilesQuerySchema.parse({
    page,
    pageSize,
    status: validStatuses.includes(filters.status as string) ? filters.status : undefined,
    agentId: filters.agentId || undefined,
    search: normalizedSearch,
  });

  const query = useQuery({
    queryKey: queryKeys.clientProfiles(page, {
      agentId: filters.agentId,
      search: normalizedSearch,
      status: filters.status,
    }),
    enabled,
    queryFn: async () => {
      const response = await api.get('/client-profiles', {
        params: parsedQuery,
      });

      return ListClientProfilesResponseSchema.parse(response.data);
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    errorMessage: query.error
      ? getErrorMessage(query.error, 'Unable to load client profiles.')
      : null,
  };
}

