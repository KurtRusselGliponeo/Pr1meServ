'use client';

import * as React from 'react';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';

type DashboardNavigationContextValue = {
  isNavigating: boolean;
  pendingHref: string | null;
  navigate: (href: string, onComplete?: () => void) => void;
};

const DashboardNavigationContext = React.createContext<
  DashboardNavigationContextValue | undefined
>(undefined);

export function DashboardNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);

  const navigate = React.useCallback(
    (href: string, onComplete?: () => void) => {
      if (href === pathname) {
        onComplete?.();
        return;
      }

      setPendingHref(href);
      startTransition(() => {
        router.push(href as Route);
        onComplete?.();
      });
    },
    [pathname, router],
  );

  React.useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const value = React.useMemo(
    () => ({
      isNavigating: isPending || pendingHref !== null,
      pendingHref,
      navigate,
    }),
    [isPending, navigate, pendingHref],
  );

  return (
    <DashboardNavigationContext.Provider value={value}>
      {children}
    </DashboardNavigationContext.Provider>
  );
}

export function useDashboardNavigation() {
  const context = React.useContext(DashboardNavigationContext);

  if (!context) {
    throw new Error('useDashboardNavigation must be used within a DashboardNavigationProvider');
  }

  return context;
}
