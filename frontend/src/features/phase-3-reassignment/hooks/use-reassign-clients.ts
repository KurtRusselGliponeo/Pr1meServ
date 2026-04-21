'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ListClientProfilesResponseSchema,
  ClientProfileReassignResponseSchema,
  ClientProfileReassignSchema,
  type ClientProfileReassign,
  type ListClientProfilesResponse,
} from '@a1prime/schemas';
import { toast } from 'sonner';

import api from '@/services/api-client';
import { queryKeys } from '@/services/query-client';

type ReassignMutationContext = {
  previousClientProfileQueries: Array<readonly [readonly unknown[], ListClientProfilesResponse | undefined]>;
};

export function useReassignClients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: queryKeys.reassignClients,
    mutationFn: async (payload: ClientProfileReassign) => {
      const parsedPayload = ClientProfileReassignSchema.parse(payload);
      const response = await api.post('/client-profiles/reassign', parsedPayload);

      return ClientProfileReassignResponseSchema.parse(response.data);
    },
    onMutate: async (payload): Promise<ReassignMutationContext> => {
      const parsedPayload = ClientProfileReassignSchema.parse(payload);

      await queryClient.cancelQueries({ queryKey: ['client-profiles'] });

      const previousClientProfileQueries =
        queryClient.getQueriesData<ListClientProfilesResponse>({ queryKey: ['client-profiles'] });

      for (const [queryKey, cachedData] of previousClientProfileQueries) {
        if (!cachedData) {
          continue;
        }

        const nextRows = cachedData.data.filter(
          (profile) => !parsedPayload.clientProfileIds.includes(profile.id),
        );

        if (nextRows.length === cachedData.data.length) {
          continue;
        }

        const removedCount = cachedData.data.length - nextRows.length;

        queryClient.setQueryData(
          queryKey,
          ListClientProfilesResponseSchema.parse({
            ...cachedData,
            data: nextRows,
            meta: {
              ...cachedData.meta,
              total: Math.max(cachedData.meta.total - removedCount, 0),
              hasNextPage:
                cachedData.meta.page * cachedData.meta.pageSize <
                Math.max(cachedData.meta.total - removedCount, 0),
            },
          }),
        );
      }

      return { previousClientProfileQueries };
    },
    onError: (_error, _payload, context) => {
      context?.previousClientProfileQueries.forEach(([queryKey, cachedData]) => {
        queryClient.setQueryData(queryKey, cachedData);
      });
      toast.error('Client reassignment failed. The orphan board has been restored.');
    },
    onSuccess: (data) => {
      toast.success(`${data.reassignedCount} client record(s) were reassigned.`);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['client-profiles'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.cosafApprovals }),
      ]);
    },
  });
}

