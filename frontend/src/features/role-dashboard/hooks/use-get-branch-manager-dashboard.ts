'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BranchManagerDashboardQuerySchema,
  BranchManagerDashboardResponseSchema,
} from '@a1prime/schemas';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';

export interface BranchManagerDashboardFilters {
  month?: number;
  year?: number;
  agentId?: string;
  status?: string;
  product?: string;
  lapsationState?: string;
}

export function useGetBranchManagerDashboard(filters: BranchManagerDashboardFilters) {
  const query = useQuery({
    queryKey: queryKeys.branchManagerDashboard(filters as Record<string, string | number | undefined>),
    queryFn: async () => {
      const params = BranchManagerDashboardQuerySchema.parse(filters);
      const response = await api.get('/agents/branch/dashboard', { params });
      return BranchManagerDashboardResponseSchema.parse(response.data);
    },
  });

  return {
    ...query,
    errorMessage: query.error
      ? getErrorMessage(query.error, 'Unable to load branch manager dashboard.')
      : null,
  };
}
