'use client';

import { useQuery } from '@tanstack/react-query';

import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';
import { fetchPerformanceMetrics } from '@/features/navigation/lib/dashboard-prefetch';

export function useGetPerformanceMetrics(month: number, year: number, filterRole = 'all') {
  const query = useQuery({
    queryKey: queryKeys.metrics(filterRole, month, year),
    queryFn: () => fetchPerformanceMetrics(month, year, filterRole),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  return {
    ...query,
    errorMessage: query.error
      ? getErrorMessage(query.error, 'Unable to load performance metrics.')
      : null,
  };
}

