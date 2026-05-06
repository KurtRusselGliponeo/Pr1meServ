'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import api from '@/services/api-client';
import type {
  PlanCodeFormValues,
  PlanCodeReference,
  UpdatePlanCodePayload,
} from '@/features/admin/types/plan-code.types';

export interface PlanCodeFilters {
  search: string;
  classification: string;
  includeInactive: boolean;
}

export function usePlanCodes(filters: PlanCodeFilters) {
  return useQuery({
    queryKey: ['plan-codes', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search.trim()) params.set('search', filters.search.trim());
      if (filters.classification) params.set('classification', filters.classification);
      if (filters.includeInactive) params.set('includeInactive', 'true');

      const { data } = await api.get<{ data: PlanCodeReference[] }>(
        `/plan-codes?${params.toString()}`,
      );
      return data.data;
    },
  });
}

export function useSavePlanCode(planCode?: PlanCodeReference | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: PlanCodeFormValues | UpdatePlanCodePayload) => {
      if (planCode) {
        const { data } = await api.patch<PlanCodeReference>(`/plan-codes/${planCode.id}`, values);
        return data;
      }

      const { data } = await api.post<PlanCodeReference>('/plan-codes', values);
      return data;
    },
    onSuccess: () => {
      toast.success(planCode ? 'Plan code updated.' : 'Plan code created.');
      void queryClient.invalidateQueries({ queryKey: ['plan-codes'] });
    },
  });
}

export function useTogglePlanCodeStatus(planCode: PlanCodeReference) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const action = planCode.isActive ? 'deactivate' : 'reactivate';
      const { data } = await api.post<PlanCodeReference>(`/plan-codes/${planCode.id}/${action}`);
      return data;
    },
    onSuccess: () => {
      toast.success(planCode.isActive ? 'Plan code deactivated.' : 'Plan code reactivated.');
      void queryClient.invalidateQueries({ queryKey: ['plan-codes'] });
    },
  });
}
