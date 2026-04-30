'use client';

import { useQuery } from '@tanstack/react-query';
import { ClientTimelineResponseSchema } from '@a1prime/schemas';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';

export function useGetClientTimeline(clientProfileId?: string) {
  const query = useQuery({
    queryKey: queryKeys.clientTimeline(clientProfileId ?? 'none'),
    enabled: Boolean(clientProfileId),
    queryFn: async () => {
      const response = await api.get(`/client-profiles/${clientProfileId}/timeline`);
      return ClientTimelineResponseSchema.parse(response.data);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error, 'Unable to load client timeline.') : null,
  };
}
