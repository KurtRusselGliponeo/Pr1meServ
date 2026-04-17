'use client';

import { useQuery } from '@tanstack/react-query';
import {
  PerformanceLeaderboardQuerySchema,
  PerformanceLeaderboardResponseSchema,
} from '@a1prime/schemas';

import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/lib/query';
import type { PerformanceLeaderboardResponse } from '../types/performance-metrics.types';

export function useGetPerformanceLeaderboard(month: number, year: number) {
  const query = useQuery({
    queryKey: queryKeys.performanceLeaderboard(month, year),
    queryFn: async () => {
      const params = PerformanceLeaderboardQuerySchema.parse({ month, year });
      const response = await api.get('/metrics/leaderboard', { params });
      return PerformanceLeaderboardResponseSchema.parse(
        response.data,
      ) as PerformanceLeaderboardResponse;
    },
  });

  return {
    ...query,
    errorMessage: query.error
      ? getErrorMessage(query.error, 'Unable to load performance leaderboard.')
      : null,
  };
}
