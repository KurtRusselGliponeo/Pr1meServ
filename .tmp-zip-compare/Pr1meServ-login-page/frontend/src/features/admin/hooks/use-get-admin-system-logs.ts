'use client';

import { useQuery } from '@tanstack/react-query';
import { AdminSystemLogsResponseSchema } from '@a1prime/schemas';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';

export function useGetAdminSystemLogs() {
  const query = useQuery({
    queryKey: queryKeys.adminSystemLogs,
    queryFn: async () => {
      const response = await api.get('/admin/logs');
      return AdminSystemLogsResponseSchema.parse(response.data);
    },
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error, 'Unable to load system logs.') : null,
  };
}
