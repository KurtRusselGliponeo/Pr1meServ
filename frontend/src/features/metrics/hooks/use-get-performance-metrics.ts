'use client';

import { useQuery } from '@tanstack/react-query';

import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/lib/query';
import type { PerformanceMetricsResponse } from '../types/performance-metrics.types';

function normalizePerformanceMetrics(data: any): PerformanceMetricsResponse {
  return {
    generatedAtUtc: data.generatedAtUtc ?? new Date().toISOString(),
    summary: {
      activeAgents: Number(data.summary?.activeAgents ?? 0),
      totalApi: Number(data.summary?.totalApi ?? 0),
      totalModalPremium: Number(data.summary?.totalModalPremium ?? 0),
      totalCommission: Number(data.summary?.totalCommission ?? 0),
    },
    points: Array.isArray(data.points)
      ? data.points.map((point: any, index: number) => ({
          month:
            point.month ??
            `${data.year ?? new Date().getFullYear()}-${String(index + 1).padStart(2, '0')}`,
          label: point.label ?? point.monthLabel ?? `M${index + 1}`,
          modalPremium: Number(point.modalPremium ?? 0),
          api: Number(point.api ?? 0),
          sumAssured: Number(point.sumAssured ?? 0),
          commissionAmount: Number(point.commissionAmount ?? 0),
        }))
      : [],
  };
}

export function useGetPerformanceMetrics(month: number, year: number, filterRole = 'all') {
  const query = useQuery({
    queryKey: queryKeys.metrics(filterRole, month, year),
    queryFn: async () => {
      const response = await api.get('/metrics', {
        params: {
          month,
          year,
          role: filterRole,
        },
      });

      return normalizePerformanceMetrics(response.data);
    },
  });

  return {
    ...query,
    errorMessage: query.error
      ? getErrorMessage(query.error, 'Unable to load performance metrics.')
      : null,
  };
}
