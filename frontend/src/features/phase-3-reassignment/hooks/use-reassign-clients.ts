'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClientProfileReassignResponseSchema,
  ClientProfileReassignSchema,
  type ClientProfileReassign,
} from '@a1prime/schemas';
import { toast } from 'sonner';

import api from '@/services/api-client';
import { queryKeys } from '@/services/query-client';

export function useReassignClients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: queryKeys.reassignClients,
    mutationFn: async (payload: ClientProfileReassign) => {
      const parsedPayload = ClientProfileReassignSchema.parse(payload);
      const response = await api.post('/client-profiles/reassign', parsedPayload);

      return ClientProfileReassignResponseSchema.parse(response.data);
    },
    onSuccess: (data) => {
      toast.success(`${data.reassignedCount} client record(s) were reassigned.`);
      void queryClient.invalidateQueries({ queryKey: ['client-profiles'] });
    },
  });
}

