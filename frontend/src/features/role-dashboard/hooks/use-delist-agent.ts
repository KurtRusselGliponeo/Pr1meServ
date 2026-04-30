'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DelistAgentRequestSchema, DelistAgentResponseSchema } from '@a1prime/schemas';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';

export function useDelistAgent() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (targetAgentCode: string) => {
      const payload = DelistAgentRequestSchema.parse({ targetAgentCode });
      const response = await api.post('/agents/delist', payload);
      return DelistAgentResponseSchema.parse(response.data);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['branch-manager-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.agentLookup('all') }),
      ]);
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error
      ? getErrorMessage(mutation.error, 'Unable to delist the selected agent.')
      : null,
  };
}
