'use client';

import { useQuery } from '@tanstack/react-query';

import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';
import { fetchAgents } from '@/features/navigation/lib/dashboard-prefetch';

export function useGetAgents(search: string, enabled = true) {
  const normalizedSearch = search.trim();

  const query = useQuery({
    queryKey: queryKeys.agentLookup(normalizedSearch || 'all'),
    enabled,
    queryFn: () => fetchAgents(normalizedSearch),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error, 'Unable to load agents.') : null,
  };
}
