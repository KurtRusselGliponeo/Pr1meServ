'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@a1prime/schemas';

import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useAuth } from '../context/auth-context';

interface RoleGuardProps {
  allowedRoles: readonly UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const router = useRouter();
  const { isHydrated, user } = useAuth();

  React.useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (user && !allowedRoles.includes(user.role)) {
      router.replace('/unauthorized');
    }
  }, [allowedRoles, isHydrated, router, user]);

  if (!isHydrated || !user || !allowedRoles.includes(user.role)) {
    return <LoadingSkeleton rows={4} columns={2} />;
  }

  return <>{children}</>;
}
