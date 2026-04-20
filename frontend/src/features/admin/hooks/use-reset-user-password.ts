'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import api from '@/services/api-client';
import { queryKeys } from '@/services/query-client';
import type { UserActionResponse } from '../types/user-management.types';

export function useResetUserPassword() {
  return useMutation({
    mutationKey: queryKeys.resetUserPassword,
    mutationFn: async (userId: string) => {
      const response = await api.post(`/users/${userId}/reset-password`);
      return response.data as UserActionResponse;
    },
    onSuccess: () => {
      toast.success('Password reset email queued.');
    },
  });
}

