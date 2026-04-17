'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import api from '@/lib/api';
import { queryKeys } from '@/lib/query';
import type { ManagedUser, UpdateUserPayload } from '../types/user-management.types';

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: queryKeys.updateUser,
    mutationFn: async ({ userId, payload }: { userId: string; payload: UpdateUserPayload }) => {
      const response = await api.patch(`/users/${userId}`, payload);
      return response.data as ManagedUser;
    },
    onSuccess: () => {
      toast.success('User account updated.');
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
