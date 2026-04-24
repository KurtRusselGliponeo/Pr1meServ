'use client';

import { useMutation } from '@tanstack/react-query';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';

function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export function useDownloadPerformanceReport() {
  const mutation = useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      const response = await api.get('/metrics/report', {
        params: { month, year },
        responseType: 'blob',
      });
      const fileName = `performance-report-${year}-${String(month).padStart(2, '0')}.csv`;
      downloadBlob(response.data as Blob, fileName);
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error
      ? getErrorMessage(mutation.error, 'Unable to download the performance report.')
      : null,
  };
}
