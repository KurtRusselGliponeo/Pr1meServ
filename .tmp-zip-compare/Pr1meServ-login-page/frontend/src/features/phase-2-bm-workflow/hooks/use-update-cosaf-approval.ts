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

type SignedCopyPayload = {
  approvalId: string;
  file: File;
};

export function useApproveCosafApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['cosaf-approvals', 'approve'],
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
    mutationKey: ['cosaf-approvals', 'reject'],
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

export function useUploadSignedCosafCopy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['cosaf-approvals', 'signed-copy'],
    mutationFn: async ({ approvalId, file }: SignedCopyPayload) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post(`/cosaf-approvals/${approvalId}/signed-copy`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
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

