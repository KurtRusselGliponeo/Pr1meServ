'use client';

import { useQuery } from '@tanstack/react-query';
import { LapsationDashboardResponseSchema } from '@a1prime/schemas';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';
import type { LapsationDashboardResponse } from '../types/lapsation.types';

export function useGetLapsationDashboard() {
  const query = useQuery({
    queryKey: queryKeys.lapsation,
    queryFn: async () => {
      const response = await api.get('/lapsation');
      return LapsationDashboardResponseSchema.parse(response.data) as LapsationDashboardResponse;
    },
  });

  return {
    ...query,
    errorMessage: query.error
      ? getErrorMessage(query.error, 'Unable to load lapsation dashboard.')
      : null,
  };
}

