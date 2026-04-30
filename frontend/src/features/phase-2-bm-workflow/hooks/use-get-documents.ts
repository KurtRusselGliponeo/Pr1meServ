'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';
import { fetchDocuments } from '@/features/navigation/lib/dashboard-prefetch';

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
    queryFn: () => fetchDocuments(filters),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  return {
    ...query,
    errorMessage: query.error
      ? getErrorMessage(query.error, 'Unable to load document library.')
      : null,
  };
}
