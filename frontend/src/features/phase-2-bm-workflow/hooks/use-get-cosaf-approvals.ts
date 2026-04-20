'use client';

import { useQuery } from '@tanstack/react-query';
import { CosafApprovalListResponseSchema } from '@a1prime/schemas';

import api from '@/services/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { queryKeys } from '@/services/query-client';
import type { CosafApprovalListResponse } from '../types/cosaf-approval.types';

export function useGetCosafApprovals() {
  const query = useQuery({
    queryKey: queryKeys.cosafApprovals,
    queryFn: async () => {
      const response = await api.get('/cosaf-approvals');
      return CosafApprovalListResponseSchema.parse(response.data) as CosafApprovalListResponse;
    },
  });

  return {
    ...query,
    errorMessage: query.error
      ? getErrorMessage(query.error, 'Unable to load COSAF approvals.')
      : null,
  };
}

