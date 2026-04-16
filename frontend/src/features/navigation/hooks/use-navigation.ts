'use client';

import { useMemo } from 'react';

import { useAuth } from '@/features/identity';
import {
  dashboardNavigationItems,
  getNavigationItemsForRole,
  type NavigationItem,
} from '@/features/navigation/config/navigation';

export function useNavigation(): {
  items: readonly NavigationItem[];
  canAccess: (href: string) => boolean;
} {
  const { user } = useAuth();

  return useMemo(
    () => ({
      items: getNavigationItemsForRole(user?.role),
      canAccess: (href: string) =>
        dashboardNavigationItems.some(
          (item) => item.href === href && (user?.role ? item.allowedRoles.includes(user.role) : false),
        ),
    }),
    [user?.role],
  );
}
