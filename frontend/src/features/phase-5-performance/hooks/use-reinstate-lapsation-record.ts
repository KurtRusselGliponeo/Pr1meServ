'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import api from '@/services/api-client';

export function useReinstateLapsationRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { policyId: string; reason?: string; notes?: string }) => {
      const response = await api.post(`/lapsation/${input.policyId}/reinstate`, {
        reason: input.reason,
        notes: input.notes,
      });
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lapsation'] });
    },
  });
}
