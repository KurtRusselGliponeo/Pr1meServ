'use client';

import { useQuery } from '@tanstack/react-query';
import { ListOrphanClientsResponseSchema } from '@a1prime/schemas';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';

export function useGetOrphanClients(enabled = true) {
  const query = useQuery({
    queryKey: ['orphan-clients'],
    enabled,
    queryFn: async () => {
      const response = await api.get('/clients/orphans');
      return ListOrphanClientsResponseSchema.parse(response.data);
    },
  });

  return {
    ...query,
    errorMessage: query.error
      ? getErrorMessage(query.error, 'Unable to load orphan pool clients.')
      : null,
  };
}
