'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import api from '@/services/api-client';
import { queryKeys } from '@/services/query-client';
import type { UserActionResponse } from '../types/user-management.types';

export function useRestoreUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: queryKeys.restoreUser,
    mutationFn: async (userId: string) => {
      const response = await api.post(`/users/${userId}/restore`);
      return response.data as UserActionResponse;
    },
    onSuccess: () => {
      toast.success('User account restored.');
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

