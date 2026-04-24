'use client';

import { useQuery } from '@tanstack/react-query';
import { ClientTimelineResponseSchema } from '@a1prime/schemas';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';

export function useGetClientTimeline(clientProfileId?: string) {
  const query = useQuery({
    queryKey: ['client-timeline', clientProfileId],
    enabled: Boolean(clientProfileId),
    queryFn: async () => {
      const response = await api.get(`/client-profiles/${clientProfileId}/timeline`);
      return ClientTimelineResponseSchema.parse(response.data);
    },
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error, 'Unable to load client timeline.') : null,
  };
}
