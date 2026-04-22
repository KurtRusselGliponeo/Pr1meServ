'use client';

import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';

import api from '@/services/api-client';

const napUploadResponseSchema = z
  .object({
    importBatchId: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough();

export type NapUploadResponse = z.infer<typeof napUploadResponseSchema>;

export function useUploadNapFile() {
  return useMutation({
    mutationKey: ['performance-imports', 'nap-upload'],
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('importType', 'NAP');

      const response = await api.post('/performance/imports/nap', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return napUploadResponseSchema.parse(response.data);
    },
  });
}
