'use client';

import { useQuery } from '@tanstack/react-query';
import { AgentProfileSchema } from '@a1prime/schemas';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';
import type { AgentProfile } from '../types/agent-profile.types';

export function useGetAgentProfile(agentId: string) {
  const query = useQuery({
    queryKey: queryKeys.agentProfile(agentId),
    queryFn: async () => {
      const response = await api.get(`/agents/${agentId}`);
      return AgentProfileSchema.parse(response.data) as AgentProfile;
    },
    enabled: Boolean(agentId),
  });

  return {
    ...query,
    errorMessage: query.error
      ? getErrorMessage(query.error, 'Unable to load the agent profile.')
      : null,
  };
}

