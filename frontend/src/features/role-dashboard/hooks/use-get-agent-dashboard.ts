'use client';

import { useQuery } from '@tanstack/react-query';
import { AgentDashboardResponseSchema } from '@a1prime/schemas';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';

export function useGetAgentDashboard() {
  const query = useQuery({
    queryKey: queryKeys.agentDashboard,
    queryFn: async () => {
      const response = await api.get('/agents/me/dashboard');
      return AgentDashboardResponseSchema.parse(response.data);
    },
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error, 'Unable to load agent dashboard.') : null,
  };
}
