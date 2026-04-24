'use client';

import { useQuery } from '@tanstack/react-query';

import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';
import { fetchCosafApprovals } from '@/features/navigation/lib/dashboard-prefetch';

export function useGetCosafApprovals() {
  const query = useQuery({
    queryKey: queryKeys.cosafApprovals,
    queryFn: fetchCosafApprovals,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  return {
    ...query,
    errorMessage: query.error
      ? getErrorMessage(query.error, 'Unable to load COSAF approvals.')
      : null,
  };
}

