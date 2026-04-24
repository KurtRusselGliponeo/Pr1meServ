'use client';

import { useQuery } from '@tanstack/react-query';
import { ClientAssignmentHistoryResponseSchema } from '@a1prime/schemas';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';

export function useGetClientHistory(clientProfileId?: string) {
  const query = useQuery({
    queryKey: ['client-history', clientProfileId],
    enabled: Boolean(clientProfileId),
    queryFn: async () => {
      const response = await api.get(`/client-profiles/${clientProfileId}/history`);
      return ClientAssignmentHistoryResponseSchema.parse(response.data);
    },
  });

  return {
    ...query,
    errorMessage: query.error
      ? getErrorMessage(query.error, 'Unable to load client assignment history.')
      : null,
  };
}
