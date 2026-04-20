'use client';

import { useQuery } from '@tanstack/react-query';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';
import type { DocumentLibraryItem } from '../types/document-library.types';

export function useGetDocuments(category?: string) {
  const query = useQuery({
    queryKey: queryKeys.documents(category),
    queryFn: async () => {
      const response = await api.get('/documents', {
        params: category ? { category } : undefined,
      });

      return response.data as DocumentLibraryItem[];
    },
  });

  return {
    ...query,
    errorMessage: query.error
      ? getErrorMessage(query.error, 'Unable to load document library.')
      : null,
  };
}

