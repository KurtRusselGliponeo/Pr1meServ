'use client';

import { useQuery } from '@tanstack/react-query';
import { AdminOverviewResponseSchema } from '@a1prime/schemas';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';

export function useGetAdminOverview() {
  const query = useQuery({
    queryKey: queryKeys.adminOverview,
    queryFn: async () => {
      const response = await api.get('/admin/overview');
      return AdminOverviewResponseSchema.parse(response.data);
    },
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error, 'Unable to load admin overview.') : null,
  };
}
