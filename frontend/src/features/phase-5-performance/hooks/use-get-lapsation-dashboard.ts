'use client';

import { useQuery } from '@tanstack/react-query';

import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';
import { fetchLapsationDashboard } from '@/features/navigation/lib/dashboard-prefetch';

export function useGetLapsationDashboard() {
  const query = useQuery({
    queryKey: queryKeys.lapsation,
    queryFn: fetchLapsationDashboard,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  return {
    ...query,
    errorMessage: query.error
      ? getErrorMessage(query.error, 'Unable to load lapsation dashboard.')
      : null,
  };
}

