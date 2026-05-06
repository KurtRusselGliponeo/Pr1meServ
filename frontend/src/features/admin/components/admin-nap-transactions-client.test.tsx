'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminNapTransactionsClient } from './admin-nap-transactions-client';

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

vi.mock('@/services/api-client', () => ({
  default: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url.includes('/admin/nap-transactions?')) {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 'nap-id',
                policyId: 'policy-id',
                policyNumber: 'POL-001',
                accountType: 'Traditional',
                contractTypeCode: 'CT-1',
                typeDesc: 'Issued business',
                transactionDate: new Date('2026-05-01T00:00:00.000Z').toISOString(),
                tempReceiptDate: null,
                agentId: 'agent-id',
                agentCode: 'AG-001',
                agentName: 'Alicia Agent',
                branchCode: 'BR-01',
                api: '1500.0000',
                ccCredit: 1,
                transactionType: 'Issued',
                creditStatus: 'Credited',
                notes: null,
                createdAtUtc: new Date().toISOString(),
                updatedAtUtc: new Date().toISOString(),
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
        });
      }

      return Promise.resolve({ data: { data: [] } });
    }),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('AdminNapTransactionsClient', () => {
  it('renders manual NAP transaction management records', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AdminNapTransactionsClient />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/manual nap transactions/i)).toBeInTheDocument();
    expect(await screen.findByText(/POL-001/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Alicia Agent/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Add transaction/i)).toBeInTheDocument();
  });
});
