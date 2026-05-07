'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminRecruitmentsClient } from './admin-recruitments-client';

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
    get: vi.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: 'recruitment-id',
            agentId: 'agent-id',
            agentCode: 'AG-001',
            agentName: 'Alicia Agent',
            recruiter: 'Coach Ray',
            umCode: 'UM-01',
            umName: 'Uma Manager',
            bmCode: 'BM-01',
            bmName: 'Ben Manager',
            team: 'Alpha',
            birthday: '1990-01-01',
            dateAppointed: new Date('2026-05-01T00:00:00.000Z').toISOString(),
            dateTerminated: null,
            status: 'Active',
            contacts: '0917',
            notes: null,
            createdAtUtc: new Date().toISOString(),
            updatedAtUtc: new Date().toISOString(),
          },
        ],
        summary: {
          total: 1,
          active: 1,
          terminated: 0,
          reinstated: 0,
          pending: 0,
        },
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

describe('AdminRecruitmentsClient', () => {
  it('renders manual recruitment management records', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AdminRecruitmentsClient />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/manual recruitment management/i)).toBeInTheDocument();
    expect(await screen.findByText(/Alicia Agent/i)).toBeInTheDocument();
    expect(screen.getByText(/Add recruitment/i)).toBeInTheDocument();
    expect(screen.getByText(/Coach Ray/i)).toBeInTheDocument();
  });
});
