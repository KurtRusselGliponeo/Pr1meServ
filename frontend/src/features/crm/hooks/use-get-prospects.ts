'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ListProspectsQuerySchema, ListProspectsResponseSchema, type ListProspectsQuery } from '@a1prime/schemas';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';

export function useGetProspects(filters: ListProspectsQuery = {}) {
  const normalizedFilters = ListProspectsQuerySchema.parse(filters);
  const queryKeyValue = JSON.stringify(normalizedFilters);
  const query = useQuery({
    queryKey: queryKeys.prospects(queryKeyValue),
    queryFn: async () => {
      const response = await api.get('/prospects', {
        params: normalizedFilters,
      });
      return ListProspectsResponseSchema.parse(response.data);
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    filtersKey: queryKeyValue,
    errorMessage: query.error ? getErrorMessage(query.error, 'Unable to load prospects.') : null,
  };
}
