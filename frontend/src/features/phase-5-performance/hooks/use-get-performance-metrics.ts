'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  GetPerformanceMetricsQuerySchema,
  PerformanceMetricsResponseSchema,
} from '@a1prime/schemas';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';
import type { PerformanceMetricsResponse } from '../types/performance-metrics.types';

export function useGetPerformanceMetrics(month: number, year: number, filterRole = 'all') {
  const query = useQuery({
    queryKey: queryKeys.metrics(filterRole, month, year),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = GetPerformanceMetricsQuerySchema.parse({
        month,
        year,
        role: filterRole,
      });
      const response = await api.get('/metrics', {
        params,
      });

      return PerformanceMetricsResponseSchema.parse(response.data) as PerformanceMetricsResponse;
    },
  });

  return {
    ...query,
    errorMessage: query.error
      ? getErrorMessage(query.error, 'Unable to load performance metrics.')
      : null,
  };
}

