'use client';

import { useQuery } from '@tanstack/react-query';
import { AdminSearchResponseSchema } from '@a1prime/schemas';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';

export function useAdminSearch(query: string, enabled = true) {
  const normalized = query.trim();
  const requestEnabled = enabled && normalized.length > 0;

  const result = useQuery({
    queryKey: queryKeys.adminSearch(normalized || 'empty'),
    enabled: requestEnabled,
    queryFn: async () => {
      const response = await api.get('/admin/search', { params: { q: normalized } });
      return AdminSearchResponseSchema.parse(response.data);
    },
  });

  return {
    ...result,
    errorMessage: result.error ? getErrorMessage(result.error, 'Unable to search right now.') : null,
  };
}
