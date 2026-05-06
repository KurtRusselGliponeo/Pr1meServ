'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LapsationPageClient } from './lapsation-page-client';

vi.mock('@/features/identity/context/auth-context', () => ({
  useAuth: () => ({
    user: { role: 'Admin' },
    isHydrated: true,
  }),
}));

vi.mock('@/features/phase-3-reassignment/hooks/use-get-agents', () => ({
  useGetAgents: () => ({
    data: { data: [] },
  }),
}));

vi.mock('./nap-ape-manual-entry', () => ({
  NapApeManualEntry: () => <div>Manual entry stub</div>,
}));

vi.mock('@/services/api-client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        generatedAtUtc: new Date().toISOString(),
        thresholdDays: 30,
        scope: { role: 'Admin', branchCode: null, agentId: null },
        summary: { totalTracked: 1, atRiskCount: 1, reinstatedYtd: 0, criticalCount: 0, lapsedCount: 0 },
        records: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            policyId: '22222222-2222-2222-2222-222222222222',
            policyNumber: 'POL-001',
            policyOwnerName: 'Jamie Client',
            lifeInsuredName: null,
            clientName: 'Jamie Client',
            status: 'At Risk',
            branchCode: 'BR-01',
            assignedAgentId: '33333333-3333-3333-3333-333333333333',
            assignedAgentName: 'Alicia Agent',
            modalPremium: '1000.0000',
            isAtRisk: true,
            riskLevel: null,
            followUpStatus: 'Open',
            statusChangedAtUtc: new Date().toISOString(),
            lapseDateUtc: null,
            reinstatedAtUtc: null,
            reason: 'Premium aging',
            notes: null,
            createdAtUtc: new Date().toISOString(),
            daysSinceLapse: null,
          },
        ],
        timeline: [],
      },
    }),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('LapsationPageClient', () => {
  it('renders policy lifecycle automation dashboard', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <LapsationPageClient />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/status and lapsation automation/i)).toBeInTheDocument();
    expect(await screen.findByText(/POL-001/i)).toBeInTheDocument();
    expect(screen.getByText(/Update status/i)).toBeInTheDocument();
    expect(screen.getAllByText(/At Risk/i).length).toBeGreaterThan(0);
  });
});
