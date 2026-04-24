'use client';

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { ProspectsPageClient } from './prospects-page-client';

vi.mock('@/features/identity/context/auth-context', () => ({
  useAuth: () => ({
    user: {
      role: 'BranchManager',
    },
  }),
}));

vi.mock('@/features/crm/hooks/use-get-prospects', () => ({
  useGetProspects: () => ({
    isPending: false,
    errorMessage: null,
    filtersKey: '{}',
    data: {
      data: [
        {
          id: 'b4a8c4a6-1b5e-4a7f-a4ec-cdb690ba4efd',
          agentCode: 'AG-001',
          branchCode: 'BR-01',
          clientName: 'Jamie Prospect',
          contactNumber: '09171234567',
          email: 'jamie@example.com',
          temperature: 'Warm',
          pipelineStage: 'Presentation',
          notes: 'Needs a callback this afternoon.',
          followUpDateUtc: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          lastContactedAtUtc: null,
          createdAtUtc: new Date().toISOString(),
          updatedAtUtc: new Date().toISOString(),
        },
      ],
    },
  }),
}));

vi.mock('@/features/phase-3-reassignment/hooks/use-get-agents', () => ({
  useGetAgents: () => ({
    isPending: false,
    data: {
      data: [
        {
          id: '1f2fcf4d-6544-4ea8-a7f2-b4d383f90f9b',
          agentCode: 'AG-001',
          displayName: 'Alicia Agent',
          email: 'alicia@example.com',
          status: 'Active',
        },
      ],
    },
  }),
}));

vi.mock('@/features/crm/hooks/use-create-prospect', () => ({
  useCreateProspect: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

vi.mock('@/features/crm/hooks/use-update-prospect', () => ({
  useUpdateProspect: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

vi.mock('@/features/crm/hooks/use-update-prospect-stage', () => ({
  useUpdateProspectStage: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

describe('ProspectsPageClient', () => {
  it('renders filters, summary, and reminder widgets', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ProspectsPageClient />
      </QueryClientProvider>,
    );

    expect(screen.getByText(/agent prospecting workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/add prospect/i)).toBeInTheDocument();
    expect(screen.getByText(/^Follow-up reminders$/i)).toBeInTheDocument();
    expect(screen.getAllByText(/jamie prospect/i)).not.toHaveLength(0);
  });
});
