'use client';

import { render, screen } from '@testing-library/react';
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

vi.mock('@/features/admin/hooks/use-get-notification-logs', () => ({
  useGetNotificationLogs: () => ({
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

vi.mock('@/features/phase-5-performance/hooks/use-get-performance-leaderboard', () => ({
  useGetPerformanceLeaderboard: () => ({
    isPending: false,
    errorMessage: null,
    data: {
      rows: [],
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
  beforeEach(() => {
    authState.user = {
      firstName: 'Test',
      lastName: 'User',
      role: 'Agent',
      email: 'test@example.com',
    };
  });

  it('renders step-by-step guidance for Agent', () => {
    render(<AgentHome />);

    expect(screen.getByText(/step 1/i)).toBeInTheDocument();
    expect(screen.getByText(/review urgent policies/i)).toBeInTheDocument();
    expect(screen.getByText(/daily workflow/i)).toBeInTheDocument();
  });

  it('renders step-by-step guidance for Branch Manager', () => {
    render(<BMHome />);

    expect(screen.getByText(/step 1/i)).toBeInTheDocument();
    expect(screen.getByText(/check orphan count/i)).toBeInTheDocument();
    expect(screen.getByText(/suggested daily order/i)).toBeInTheDocument();
  });

  it('renders step-by-step guidance for Admin', () => {
    render(<AdminHome />);

    expect(screen.getByText(/step 1/i)).toBeInTheDocument();
    expect(screen.getByText(/check system health/i)).toBeInTheDocument();
    expect(screen.getByText(/recommended admin flow/i)).toBeInTheDocument();
  });
});
