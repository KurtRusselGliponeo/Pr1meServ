'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminDataCenterClient } from './admin-data-center-client';

vi.mock('@/features/admin/components/admin-policy-records-client', () => ({
  AdminPolicyRecordsClient: () => <div>Policies module stub</div>,
}));

vi.mock('@/features/admin/components/admin-nap-transactions-client', () => ({
  AdminNapTransactionsClient: () => <div>NAP module stub</div>,
}));

vi.mock('@/features/admin/components/admin-recruitments-client', () => ({
  AdminRecruitmentsClient: () => <div>Recruitment module stub</div>,
}));

vi.mock('@/features/admin/components/persistency-page-client', () => ({
  PersistencyPageClient: () => <div>Persistency module stub</div>,
}));

vi.mock('@/features/admin/components/plan-codes-page-client', () => ({
  PlanCodesPageClient: () => <div>Plan code module stub</div>,
}));

vi.mock('@/services/api-client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        generatedAtUtc: new Date().toISOString(),
        cards: {
          policiesIssued: 12,
          totalNap: 34000,
          totalApeApi: 56000,
          activeValidationIssues: 3,
          lapsedOrAtRiskPolicies: 4,
          recruitmentCount: 8,
        },
      },
    }),
  },
}));

describe('AdminDataCenterClient', () => {
  it('renders main tabs and switches modules', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AdminDataCenterClient />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/unified operational workspace/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Overview$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Policies$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^NAP Transactions$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Recruitment$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Persistency$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Plan Codes$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Policy Status$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Validation Issues$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Reports$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Policies/i }));
    expect(await screen.findByText(/Policies module stub/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Recruitment/i }));
    expect(await screen.findByText(/Recruitment module stub/i)).toBeInTheDocument();
  });
});
