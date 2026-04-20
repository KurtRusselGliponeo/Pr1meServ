'use client';

import { useMutation } from '@tanstack/react-query';
import {
  ClientProfileReassignPreflightResponseSchema,
  ClientProfileReassignSchema,
  type ClientProfileReassign,
} from '@a1prime/schemas';

import api from '@/services/api-client';
import { queryKeys } from '@/services/query-client';

export function useReassignPreflight() {
  return useMutation({
    mutationKey: queryKeys.reassignPreflight,
    mutationFn: async (payload: ClientProfileReassign) => {
      const parsedPayload = ClientProfileReassignSchema.parse(payload);
      const response = await api.post('/client-profiles/reassign/preflight', parsedPayload);
      return ClientProfileReassignPreflightResponseSchema.parse(response.data);
    },
  });
}
