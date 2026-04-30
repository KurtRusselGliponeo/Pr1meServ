'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import api from '@/services/api-client';
import { queryKeys } from '@/services/query-client';

export function useUploadAgentProfilePhoto(agentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['upload-agent-profile-photo', agentId],
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post(`/agents/${agentId}/profile-photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Profile photo updated.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.agentProfile(agentId) });
    },
  });
}
