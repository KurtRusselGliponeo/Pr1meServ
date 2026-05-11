'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminDataCenterClient } from './admin-data-center-client';

const { getMock, patchMock } = vi.hoisted(() => ({
  getMock: vi.fn(async (url: string) => {
    if (url === '/admin/data-center/summary') {
      return {
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
      };
    }

    if (url.startsWith('/admin/data-center/validation-issues')) {
      return {
        data: {
          data: [
            {
              id: 'issue-1',
              module: 'Policy',
              entityName: 'Policy',
              entityId: 'entity-1',
              issueCode: 'POLICY_PLAN_MISMATCH',
              severity: 'error',
              status: 'Open',
              details: 'Plan code does not match the stored plan name.',
              recommendedFix: 'Review the policy plan code.',
              createdAtUtc: new Date().toISOString(),
              updatedAtUtc: new Date().toISOString(),
              resolvedAtUtc: null,
              createdByName: 'Admin User',
            },
          ],
          meta: {
            total: 1,
            page: 1,
            pageSize: 50,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      };
    }

    if (url.startsWith('/admin/data-center/audit-feed?')) {
      return {
        data: {
          data: [
            {
              id: 'audit-1',
              action: 'policy.status-change',
              entityName: 'Policy',
              entityId: 'entity-1',
              oldValue: { status: 'Active' },
              newValue: { status: 'At Risk' },
              createdAtUtc: new Date().toISOString(),
              actorName: 'Admin User',
            },
          ],
          meta: {
            total: 1,
            page: 1,
            pageSize: 30,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      };
    }

    if (url.startsWith('/admin/data-center/reports/export?reportType=')) {
      return { data: 'header\nrow' };
    }

    if (url.startsWith('/admin/data-center/audit-feed/Policy/entity-1')) {
      return {
        data: {
          data: [
            {
              id: 'audit-1',
              action: 'policy.status-change',
              entityName: 'Policy',
              entityId: 'entity-1',
              oldValue: { status: 'Active' },
              newValue: { status: 'At Risk' },
              createdAtUtc: new Date().toISOString(),
              actorName: 'Admin User',
            },
          ],
        },
      };
    }

    throw new Error(`Unhandled GET ${url}`);
  }),
  patchMock: vi.fn().mockResolvedValue({ data: {} }),
}));

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
    get: getMock,
    patch: patchMock,
  },
}));

describe('AdminDataCenterClient', () => {
  it('renders main tabs, validation issues, and audit feed modules', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AdminDataCenterClient />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/unified operational workspace/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Validation Issues$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Policy Status$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Reports$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Validation Issues$/i }));
    expect(await screen.findByText(/POLICY_PLAN_MISMATCH/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Policy Status$/i }));
    expect(await screen.findByText(/policy\.status-change/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Policies$/i }));
    expect(await screen.findByText(/Policies module stub/i)).toBeInTheDocument();
  });
});
