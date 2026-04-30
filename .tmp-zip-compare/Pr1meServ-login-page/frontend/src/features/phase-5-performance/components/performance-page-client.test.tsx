'use client';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PerformancePageClient } from './performance-page-client';

const authState = vi.hoisted(() => ({
  user: {
    id: 'admin-user',
    firstName: 'Andrea',
    lastName: 'Admin',
    email: 'andrea@example.com',
    role: 'Admin' as const,
    needsPasswordReset: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
}));

vi.mock('@/features/identity/context/auth-context', () => ({
  useAuth: () => ({
    user: authState.user,
  }),
}));

vi.mock('../hooks/use-get-performance-metrics', () => ({
  useGetPerformanceMetrics: () => ({
    isPending: false,
    errorMessage: null,
    data: {
      generatedAtUtc: new Date().toISOString(),
      scope: { role: 'Admin', branchCode: null, agentId: null },
      summary: {
        activeAgents: 2,
        totalApi: 100000,
        totalModalPremium: 85000,
        totalCommission: 12000,
        totalSales: 12000,
        totalNap: 100000,
        totalApe: 85000,
        totalRecruitment: 5,
        atRiskCount: 3,
        lapsedCount: 1,
        reinstatementCount: 2,
        persistencyRate: 94,
      },
      points: [
        {
          month: '2026-01',
          label: 'Jan',
          modalPremium: 10000,
          api: 12000,
          sumAssured: 0,
          commissionAmount: 1000,
          recruitmentCount: 1,
          lapsationCount: 1,
          reinstatementCount: 0,
          persistencyRate: 92,
        },
      ],
    },
  }),
}));

vi.mock('../hooks/use-get-performance-leaderboard', () => ({
  useGetPerformanceLeaderboard: () => ({
    isPending: false,
    errorMessage: null,
    data: {
      generatedAtUtc: new Date().toISOString(),
      recordMonth: '2026-01',
      scope: { role: 'Admin', branchCode: null, agentId: null },
      rows: [
        {
          agentId: 'agent-1',
          agentName: 'Alex Agent',
          branchCode: 'BR-01',
          recordMonth: '2026-01',
          api: 12000,
          modalPremium: 10000,
          commissionAmount: 1000,
          recruitmentCount: 1,
          lapsationCount: 1,
          reinstatementCount: 1,
          persistencyRate: 95,
          lapsationRate: 0.1,
          score: 13000,
        },
      ],
      branches: [
        {
          branchCode: 'BR-01',
          totalSales: 1000,
          totalNap: 12000,
          totalApe: 10000,
          totalRecruitment: 1,
          persistencyRate: 95,
          lapsationCount: 1,
          reinstatementCount: 1,
          activeAgents: 1,
        },
      ],
    },
  }),
}));

vi.mock('../hooks/use-download-performance-report', () => ({
  useDownloadPerformanceReport: () => ({
    isPending: false,
    errorMessage: null,
    mutateAsync: vi.fn(),
  }),
}));

describe('PerformancePageClient', () => {
  it('renders branch comparison and download action for Admin users', () => {
    render(<PerformancePageClient />);

    expect(screen.getByText(/download report/i)).toBeInTheDocument();
    expect(screen.getByText(/branch comparison/i)).toBeInTheDocument();
    expect(screen.getByText(/alex agent/i)).toBeInTheDocument();
    expect(screen.getAllByText(/total sales/i)).not.toHaveLength(0);
  });
});
