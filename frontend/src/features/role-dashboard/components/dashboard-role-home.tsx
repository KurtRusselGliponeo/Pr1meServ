'use client';

import { ShieldAlert } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useAuth } from '@/features/identity/context/auth-context';
import { AgentHome } from './agent-home';
import { BMHome } from './bm-home';
import { AdminHome } from './admin-home';

export function DashboardRoleHome() {
  const { user, isHydrated, isRestoringSession } = useAuth();

  if (!isHydrated || isRestoringSession) {
    return <LoadingSkeleton rows={5} columns={4} />;
  }

  if (!user) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Dashboard unavailable"
        description="Your session could not be restored. Please sign in again."
      />
    );
  }

  if (user.role === 'Agent') {
    return <AgentHome />;
  }

  if (user.role === 'BranchManager') {
    return <BMHome />;
  }

  if (user.role === 'Admin') {
    return <AdminHome />;
  }

  return (
    <EmptyState
      icon={ShieldAlert}
      title="Unknown role"
      description="This account does not map to a supported dashboard experience yet."
    />
  );
}
