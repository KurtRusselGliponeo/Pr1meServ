'use client';

import { useQuery } from '@tanstack/react-query';
import { ListProspectsResponseSchema } from '@a1prime/schemas';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';

export function useGetProspects() {
  const query = useQuery({
    queryKey: queryKeys.prospects,
    queryFn: async () => {
      const response = await api.get('/prospects');
      return ListProspectsResponseSchema.parse(response.data);
    },
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error, 'Unable to load prospects.') : null,
  };
}
