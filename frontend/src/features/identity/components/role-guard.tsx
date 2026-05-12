'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@a1prime/schemas';

import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useAuth } from '../context/auth-context';
import { ShieldAlert } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: readonly UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const router = useRouter();
  const { isHydrated, isRestoringSession, user } = useAuth();

  React.useEffect(() => {
    if (!isHydrated || (isRestoringSession && !user)) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      router.replace('/unauthorized');
    }
  }, [allowedRoles, isHydrated, isRestoringSession, router, user]);

  if (!isHydrated || (isRestoringSession && !user)) {
    return <LoadingSkeleton rows={4} columns={2} />;
  }

  if (!user) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Session unavailable"
        description="Your session could not be restored. Redirecting you to sign in."
      />
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Access unavailable"
        description="This page is only available to accounts with the required role."
      />
    );
  }

  return <>{children}</>;
}
