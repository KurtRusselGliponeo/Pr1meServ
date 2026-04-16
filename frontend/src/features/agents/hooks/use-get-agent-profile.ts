'use client';

import { useQuery } from '@tanstack/react-query';

import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/lib/query';
import type { AgentProfile } from '../types/agent-profile.types';

function normalizeAgentProfile(data: any): AgentProfile {
  return {
    id: data.id,
    userId: data.userId ?? data.id,
    email: data.email ?? '',
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    displayName: data.displayName ?? `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
    agentCode: data.agentCode ?? '',
    role: data.role ?? 'Agent',
    createdAtUtc: data.createdAtUtc ?? data.createdAt ?? new Date().toISOString(),
    updatedAtUtc: data.updatedAtUtc ?? data.updatedAt ?? new Date().toISOString(),
    auditTrail: Array.isArray(data.auditTrail)
      ? data.auditTrail.map((entry: any, index: number) => ({
          id: entry.id ?? `${data.id}-audit-${index}`,
          action: entry.action ?? 'profile.updated',
          actorName: entry.actorName ?? 'System',
          timestampUtc: entry.timestampUtc ?? new Date().toISOString(),
          summary: entry.summary ?? 'Profile change recorded.',
        }))
      : [],
  };
}

export function useGetAgentProfile(agentId: string) {
  const query = useQuery({
    queryKey: queryKeys.agentProfile(agentId),
    queryFn: async () => {
      const response = await api.get(`/agents/${agentId}`);
      return normalizeAgentProfile(response.data);
    },
    enabled: Boolean(agentId),
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error, 'Unable to load the agent profile.') : null,
  };
}
