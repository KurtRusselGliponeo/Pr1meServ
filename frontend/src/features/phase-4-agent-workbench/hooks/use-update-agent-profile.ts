'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import api from '@/services/api-client';
import { queryKeys } from '@/services/query-client';
import type { UpdateAgentProfilePayload } from '../types/agent-profile.types';

export function useUpdateAgentProfile(agentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: queryKeys.updateAgent,
    mutationFn: async (payload: UpdateAgentProfilePayload) => {
      const response = await api.patch(`/agents/${agentId}`, payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Agent profile saved.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.agentProfile(agentId) });
    },
  });
}

