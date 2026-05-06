'use client';

import { useQuery } from '@tanstack/react-query';

import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';
import { fetchLapsationDashboard } from '@/features/navigation/lib/dashboard-prefetch';

export interface LapsationDashboardFilters {
  search?: string;
  branchCode?: string;
  agentId?: string;
  status?: string;
  followUpStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useGetLapsationDashboard(filters: LapsationDashboardFilters = {}) {
  const normalized = JSON.stringify(filters);
  const query = useQuery({
    queryKey: queryKeys.lapsation(normalized),
    queryFn: () => fetchLapsationDashboard(filters),
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

