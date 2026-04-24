'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateClientCaseStatus } from '@a1prime/schemas';

import api from '@/services/api-client';

export function useUpdateClientCaseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['client-profiles', 'status-update'],
    mutationFn: async (payload: { clientProfileId: string; body: UpdateClientCaseStatus }) => {
      const response = await api.patch(`/client-profiles/${payload.clientProfileId}/status`, payload.body);
      return response.data;
    },
    onSuccess: async (_response, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['client-profiles'] }),
        queryClient.invalidateQueries({ queryKey: ['client-history', variables.clientProfileId] }),
        queryClient.invalidateQueries({ queryKey: ['client-timeline', variables.clientProfileId] }),
        queryClient.invalidateQueries({ queryKey: ['cosaf-approvals'] }),
      ]);
    },
  });
}
