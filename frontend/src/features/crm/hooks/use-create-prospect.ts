'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ProspectSchema, type CreateProspect } from '@a1prime/schemas';
import { toast } from 'sonner';

import api from '@/services/api-client';
import { queryKeys } from '@/services/query-client';
import { getErrorMessage } from '@/lib/error-utils';

export function useCreateProspect(activeFiltersKey: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: queryKeys.createProspect,
    mutationFn: async (payload: CreateProspect) => {
      const response = await api.post('/prospects', payload);
      return ProspectSchema.parse(response.data);
    },
    onSuccess: () => {
      toast.success('Prospect added to the pipeline.');
      void queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === queryKeys.prospects(activeFiltersKey)[0],
      });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Unable to create prospect.'));
    },
  });
}
