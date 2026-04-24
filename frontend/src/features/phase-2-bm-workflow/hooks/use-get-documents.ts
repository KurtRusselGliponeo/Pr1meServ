'use client';

import { useQuery } from '@tanstack/react-query';
import { listDocumentsResponseSchema } from '@a1prime/schemas';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';

interface UseGetDocumentsFilters {
  category?: string;
  search?: string;
  fileType?: string;
  includeArchived?: boolean;
}

export function useGetDocuments(filters: UseGetDocumentsFilters = {}) {
  const query = useQuery({
    queryKey: queryKeys.documents(
      `${filters.category ?? 'all'}:${filters.search ?? ''}:${filters.fileType ?? 'all'}:${filters.includeArchived ? 'archived' : 'active'}`,
    ),
    queryFn: async () => {
      const response = await api.get('/documents', {
        params: {
          category: filters.category,
          search: filters.search?.trim() || undefined,
          fileType: filters.fileType?.trim() || undefined,
          includeArchived: filters.includeArchived ?? false,
        },
      });

      return listDocumentsResponseSchema.parse(response.data);
    },
  });

  return {
    ...query,
    errorMessage: query.error
      ? getErrorMessage(query.error, 'Unable to load document library.')
      : null,
  };
}

