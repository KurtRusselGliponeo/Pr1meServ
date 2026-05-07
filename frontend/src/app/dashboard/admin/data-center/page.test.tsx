'use client';

import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import AdminDataCenterPage from './page';

const replaceMock = vi.fn();
const authState = vi.hoisted(() => ({
  isHydrated: true,
  user: { role: 'Admin' as 'Admin' | 'Agent' },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock('@/features/identity/context/auth-context', () => ({
  useAuth: () => authState,
}));

vi.mock('@/features/admin/components/admin-data-center-client', () => ({
  AdminDataCenterClient: () => <div>Admin Data Center Client</div>,
}));

describe('AdminDataCenterPage', () => {
  beforeEach(() => {
    replaceMock.mockReset();
    authState.isHydrated = true;
    authState.user = { role: 'Admin' };
  });

  it('renders for admin users', async () => {
    render(<AdminDataCenterPage />);
    expect(await screen.findByText(/Admin Data Center Client/i)).toBeInTheDocument();
  });

  it('blocks non-admin users through the current role-guard pattern', async () => {
    authState.user = { role: 'Agent' };
    render(<AdminDataCenterPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/unauthorized');
    });
  });
});
