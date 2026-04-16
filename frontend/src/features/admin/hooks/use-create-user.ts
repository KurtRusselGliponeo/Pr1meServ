'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import api from '@/lib/api';
import { queryKeys } from '@/lib/query';
import type { CreateUserPayload } from '../types/user-management.types';

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: queryKeys.createUser,
    mutationFn: async (payload: CreateUserPayload) => {
      const response = await api.post('/users', payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success('User account created.');
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
