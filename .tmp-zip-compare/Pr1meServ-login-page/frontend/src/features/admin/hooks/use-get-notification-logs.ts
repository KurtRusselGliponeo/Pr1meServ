'use client';

import { useQuery } from '@tanstack/react-query';
import { NotificationLogsResponseSchema } from '@a1prime/schemas';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';
import type { NotificationLogsResponse } from '../types/notification-log.types';

export function useGetNotificationLogs() {
  const query = useQuery({
    queryKey: queryKeys.notificationLogs,
    queryFn: async () => {
      const response = await api.get('/notifications/logs');
      return NotificationLogsResponseSchema.parse(response.data) as NotificationLogsResponse;
    },
  });

  return {
    ...query,
    errorMessage: query.error
      ? getErrorMessage(query.error, 'Unable to load notification logs.')
      : null,
  };
}

