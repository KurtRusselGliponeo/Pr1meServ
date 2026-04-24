'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ProspectPipelineStage } from '@a1prime/schemas';

import api from '@/services/api-client';
import { queryKeys } from '@/services/query-client';

export function useUpdateProspectStage(activeFiltersKey: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: queryKeys.updateProspectStage,
    mutationFn: async (payload: { prospectId: string; pipelineStage: ProspectPipelineStage }) => {
      const response = await api.patch(`/prospects/${payload.prospectId}/stage`, {
        pipelineStage: payload.pipelineStage,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Prospect stage updated.');
      void queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === queryKeys.prospects(activeFiltersKey)[0],
      });
    },
    onError: () => {
      toast.error('Unable to update prospect stage.');
    },
  });
}
