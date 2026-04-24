'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ProspectSchema, type UpdateProspect } from '@a1prime/schemas';
import { toast } from 'sonner';

import api from '@/services/api-client';
import { queryKeys } from '@/services/query-client';
import { getErrorMessage } from '@/lib/error-utils';

export function useUpdateProspect(activeFiltersKey: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: queryKeys.updateProspect,
    mutationFn: async (payload: { prospectId: string; body: UpdateProspect }) => {
      const response = await api.patch(`/prospects/${payload.prospectId}`, payload.body);
      return ProspectSchema.parse(response.data);
    },
    onSuccess: () => {
      toast.success('Prospect details saved.');
      void queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === queryKeys.prospects(activeFiltersKey)[0],
      });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Unable to update prospect.'));
    },
  });
}
