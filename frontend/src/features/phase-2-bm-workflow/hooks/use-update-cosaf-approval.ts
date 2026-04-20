'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import api from '@/services/api-client';
import { queryKeys } from '@/services/query-client';

type ApprovePayload = {
  approvalId: string;
};

type RejectPayload = {
  approvalId: string;
  reason: string;
};

export function useApproveCosafApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ approvalId }: ApprovePayload) => {
      const response = await api.post(`/cosaf-approvals/${approvalId}/approve`);
      return response.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.cosafApprovals }),
        queryClient.invalidateQueries({ queryKey: ['client-profiles'] }),
      ]);
    },
  });
}

export function useRejectCosafApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ approvalId, reason }: RejectPayload) => {
      const response = await api.post(`/cosaf-approvals/${approvalId}/reject`, { reason });
      return response.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.cosafApprovals }),
        queryClient.invalidateQueries({ queryKey: ['client-profiles'] }),
      ]);
    },
  });
}

