'use client';

import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { AgentHome } from './agent-home';
import { AdminHome } from './admin-home';
import { BMHome } from './bm-home';

const authState = vi.hoisted(() => ({
  user: {
    firstName: 'Test',
    lastName: 'User',
    role: 'Agent' as const,
    email: 'test@example.com',
  },
}));

vi.mock('@/features/identity/context/auth-context', () => ({
  useAuth: () => ({
    user: authState.user,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/features/admin/hooks/use-get-notification-logs', () => ({
  useGetNotificationLogs: () => ({
    isPending: false,
    errorMessage: null,
    data: { data: [] },
  }),
}));

vi.mock('@/features/admin/hooks/use-admin-search', () => ({
  useAdminSearch: () => ({
    data: { data: [] },
  }),
}));

vi.mock('@/features/admin/hooks/use-get-admin-overview', () => ({
  useGetAdminOverview: () => ({
    isPending: false,
    errorMessage: null,
    data: {
      totals: {
        activeUsers: 1,
        activeAgents: 1,
        orphanClients: 0,
        pendingApprovals: 0,
      },
    },
  }),
}));

vi.mock('@/features/admin/hooks/use-get-admin-system-logs', () => ({
  useGetAdminSystemLogs: () => ({
    isPending: false,
    errorMessage: null,
    data: { data: [] },
  }),
}));

vi.mock('@/features/phase-3-reassignment/hooks/use-get-agents', () => ({
  useGetAgents: () => ({
    data: { data: [] },
  }),
}));

vi.mock('@/features/phase-2-bm-workflow/hooks/use-get-client-profiles', () => ({
  useGetClientProfiles: () => ({
    data: { data: [] },
  }),
}));

vi.mock('@/features/phase-5-performance/hooks/use-get-lapsation-dashboard', () => ({
  useGetLapsationDashboard: () => ({
    isPending: false,
    errorMessage: null,
    data: {
      records: [],
      summary: {
        atRiskCount: 0,
        totalTracked: 0,
      },
    },
  }),
}));

vi.mock('../hooks/use-get-agent-dashboard', () => ({
  useGetAgentDashboard: () => ({
    isPending: false,
    errorMessage: null,
    data: {
      agent: { displayName: 'Test User', branchCode: 'BR-01' },
      summary: {
        persistency: 95,
        activePolicies: 10,
        totalApi: 1000,
        totalApe: 900,
        policyCount: 12,
        recruitmentCount: 3,
        warningPolicies: 1,
        urgentPolicies: 0,
        lapsedPolicies: 0,
      },
      assignedClients: [],
      recentHistory: [],
      atRiskPolicies: [],
      prospects: {
        total: 0,
        contacted: 0,
        clientAgreed: 0,
        presentation: 0,
        approved: 0,
        closed: 0,
      },
      quickActions: [{ label: 'Update contact status', description: 'desc', href: '/dashboard/cosaf' }],
    },
  }),
}));

vi.mock('@/features/phase-5-performance/hooks/use-get-performance-leaderboard', () => ({
  useGetPerformanceLeaderboard: () => ({
    isPending: false,
    errorMessage: null,
    data: {
      rows: [],
    },
  }),
}));

vi.mock('../hooks/use-get-branch-manager-dashboard', () => ({
  useGetBranchManagerDashboard: () => ({
    isPending: false,
    errorMessage: null,
    data: {
      branch: { branchCode: 'BR-01', month: 4, year: 2026 },
      summary: {
        orphanClientCount: 2,
        pendingCosafApprovals: 1,
        warningPolicies: 1,
        urgentPolicies: 1,
        lapsedPolicies: 0,
        activeAgents: 3,
        totalApi: 1000,
        totalApe: 900,
      },
      topPerformers: [],
      bottomPerformers: [],
      filteredClients: [],
    },
  }),
}));

vi.mock('../hooks/use-get-orphan-clients', () => ({
  useGetOrphanClients: () => ({
    isPending: false,
    errorMessage: null,
    data: {
      meta: {
        total: 0,
      },
    },
  }),
}));

describe('role home guided workflows', () => {
  function renderWithProviders(ui: ReactElement) {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  }

  beforeEach(() => {
    authState.user = {
      firstName: 'Test',
      lastName: 'User',
      role: 'Agent',
      email: 'test@example.com',
    };
  });

  it('renders step-by-step guidance for Agent', () => {
    renderWithProviders(<AgentHome />);

    expect(screen.getByText(/agent workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/persistency/i)).toBeInTheDocument();
    expect(screen.getByText(/update contact status/i)).toBeInTheDocument();
  });

  it('renders step-by-step guidance for Branch Manager', () => {
    renderWithProviders(<BMHome />);

    expect(screen.getByText(/branch manager workspace/i)).toBeInTheDocument();
    expect(
      screen.getByText(/filter branch reports by month, agent, status, product, and lapsation state/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/delist agent workflow/i)).toBeInTheDocument();
  });

  it('renders step-by-step guidance for Admin', () => {
    renderWithProviders(<AdminHome />);

    expect(screen.getByText(/admin quick actions/i)).toBeInTheDocument();
    expect(screen.getAllByText(/search agents and clients/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/main admin work areas/i)).toBeInTheDocument();
  });
});
