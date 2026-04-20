'use client';

import { useQuery } from '@tanstack/react-query';
import { AgentLookupResponseSchema, ListAgentsQuerySchema } from '@a1prime/schemas';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';

export function useGetAgents(search: string, enabled = true) {
  const normalizedSearch = search.trim();

  const query = useQuery({
    queryKey: queryKeys.agentLookup(normalizedSearch || 'all'),
    enabled,
    queryFn: async () => {
      const params = ListAgentsQuerySchema.parse({
        search: normalizedSearch || undefined,
        limit: 12,
      });
      const response = await api.get('/agents', { params });
      return AgentLookupResponseSchema.parse(response.data);
    },
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error, 'Unable to load agents.') : null,
  };
}
