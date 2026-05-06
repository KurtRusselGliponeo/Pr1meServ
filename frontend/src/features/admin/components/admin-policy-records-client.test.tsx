'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminPolicyRecordsClient } from './admin-policy-records-client';

vi.mock('@/features/phase-3-reassignment/hooks/use-get-agents', () => ({
  useGetAgents: () => ({
    data: {
      data: [
        {
          id: 'agent-id',
          displayName: 'Alicia Agent',
          agentCode: 'AG-001',
        },
      ],
    },
  }),
}));

vi.mock('@/features/admin/hooks/use-plan-codes', () => ({
  usePlanCodes: () => ({
    data: [
      {
        id: 'plan-id',
        planCode: 'PRU123',
        planName: 'PRU Plan 123',
      },
    ],
  }),
}));

vi.mock('@/services/api-client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: 'policy-id',
            clientProfileId: null,
            assignedAgentId: 'agent-id',
            agentCode: 'AG-001',
            agentName: 'Alicia Agent',
            branchCode: 'BR-01',
            policyNumber: 'POL-001',
            policyOwnerName: 'Jamie Client',
            lifeInsuredName: 'Jamie Client',
            planCode: 'PRU123',
            planName: 'PRU Plan 123',
            currency: 'PHP',
            firstIssueDate: '2026-05-01',
            mode: 'Monthly',
            modalPremium: '1000',
            sumAssured: '50000',
            api: '12000',
            policyStatus: 'Active',
            notes: null,
            createdAtUtc: new Date().toISOString(),
            updatedAtUtc: new Date().toISOString(),
            validationIssues: [],
          },
        ],
        meta: {
          total: 1,
          page: 1,
          pageSize: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    }),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('AdminPolicyRecordsClient', () => {
  it('renders manual issued policy management records', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AdminPolicyRecordsClient />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/manual policy \/ issued business/i)).toBeInTheDocument();
    expect(await screen.findByText(/POL-001/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Alicia Agent/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Add policy/i)).toBeInTheDocument();
  });
});
