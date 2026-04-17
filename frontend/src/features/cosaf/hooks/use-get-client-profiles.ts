'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ListClientProfilesQuerySchema, ListClientProfilesResponseSchema } from '@a1prime/schemas';

import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/lib/query';

export interface ClientProfilesFilters {
  status?: string;
  agentId?: string;
  search?: string;
}

export function useGetClientProfiles(page: number, filters: ClientProfilesFilters) {
  const validStatuses = ['Uncontacted', 'Contacted', 'Submitted', 'Reviewed', 'Completed', 'Returned'];
  const parsedQuery = ListClientProfilesQuerySchema.parse({
    page,
    pageSize: 10,
    status: validStatuses.includes(filters.status as string) ? filters.status : undefined,
    agentId: filters.agentId || undefined,
  });

  const query = useQuery({
    queryKey: queryKeys.clientProfiles(page, {
      agentId: filters.agentId,
      search: filters.search,
      status: filters.status,
    }),
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
