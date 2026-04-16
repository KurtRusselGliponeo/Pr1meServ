'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ClientProfileImportResponseSchema } from '@a1prime/schemas';

import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/lib/query';

export function useImportClientProfiles() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey: queryKeys.importProfiles,
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/client-profiles/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: () => undefined,
      });

      return ClientProfileImportResponseSchema.parse(response.data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['client-profiles'],
      });
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error
      ? getErrorMessage(mutation.error, 'Unable to import client profiles.')
      : null,
  };
}
