'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';
import { fetchPerformanceLeaderboard } from '@/features/navigation/lib/dashboard-prefetch';

export function useGetPerformanceLeaderboard(month: number, year: number) {
  const query = useQuery({
    queryKey: queryKeys.performanceLeaderboard(month, year),
    queryFn: () => fetchPerformanceLeaderboard(month, year),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  return {
    ...query,
    errorMessage: query.error
      ? getErrorMessage(query.error, 'Unable to load performance leaderboard.')
      : null,
  };
}
