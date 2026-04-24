'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';
import { fetchClientProfiles } from '@/features/navigation/lib/dashboard-prefetch';

export interface ClientProfilesFilters {
  status?: string;
  agentId?: string;
  branchCode?: string;
  product?: string;
  search?: string;
}

export function useGetClientProfiles(
  page: number,
  filters: ClientProfilesFilters,
  pageSize = 10,
  enabled = true,
) {
  const normalizedSearch = filters.search?.trim() || undefined;

  const query = useQuery({
    queryKey: queryKeys.clientProfiles(page, {
      agentId: filters.agentId,
      branchCode: filters.branchCode,
      product: filters.product,
      search: normalizedSearch,
      status: filters.status,
    }),
    enabled,
    queryFn: () => fetchClientProfiles(page, filters, pageSize),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  return {
    ...query,
    errorMessage: query.error
      ? getErrorMessage(query.error, 'Unable to load client profiles.')
      : null,
  };
}

