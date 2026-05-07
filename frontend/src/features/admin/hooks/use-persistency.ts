'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import api from '@/services/api-client';
import type {
  PersistencyFormValues,
  PersistencyListResponse,
  PersistencyRecord,
  UpdatePersistencyPayload,
} from '@/features/admin/types/persistency.types';

export interface PersistencyFilters {
  recordMonth: string;
  search: string;
  agentId: string;
  branchCode: string;
  agentType: string;
  team: string;
  lowOnly: boolean;
}

export function usePersistencyRecords(filters: PersistencyFilters) {
  return useQuery({
    queryKey: ['persistency-records', filters],
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: '100' });
      if (filters.recordMonth) params.set('recordMonth', filters.recordMonth);
      if (filters.search.trim()) params.set('search', filters.search.trim());
      if (filters.agentId) params.set('agentId', filters.agentId);
      if (filters.branchCode.trim()) params.set('branchCode', filters.branchCode.trim());
      if (filters.agentType.trim()) params.set('agentType', filters.agentType.trim());
      if (filters.team.trim()) params.set('team', filters.team.trim());
      if (filters.lowOnly) params.set('lowOnly', 'true');

      const { data } = await api.get<PersistencyListResponse>(`/persistency?${params.toString()}`);
      return data;
    },
  });
}

export function useSavePersistencyRecord(record?: PersistencyRecord | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: PersistencyFormValues | UpdatePersistencyPayload) => {
      if (record) {
        const { data } = await api.patch<PersistencyRecord>(`/persistency/${record.id}`, values);
        return data;
      }

      const { data } = await api.post<PersistencyRecord>('/persistency', values);
      return data;
    },
    onSuccess: () => {
      toast.success(record ? 'Persistency record updated.' : 'Persistency record created.');
      void queryClient.invalidateQueries({ queryKey: ['persistency-records'] });
      void queryClient.invalidateQueries({ queryKey: ['metrics'] });
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}
