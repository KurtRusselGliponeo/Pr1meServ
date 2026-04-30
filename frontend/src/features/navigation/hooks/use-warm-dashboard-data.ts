'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/identity/context/auth-context';
import { queryKeys } from '@/services/query-client';
import {
  fetchAgents,
  fetchClientProfiles,
  fetchCosafApprovals,
  fetchDocuments,
  fetchLapsationDashboard,
  fetchPerformanceLeaderboard,
  fetchPerformanceMetrics,
  fetchProspects,
} from '../lib/dashboard-prefetch';

function getCurrentReportingWindow() {
  const now = new Date();
  return {
    month: now.getUTCMonth() + 1,
    year: now.getUTCFullYear(),
  };
}

export function useWarmDashboardData() {
  const queryClient = useQueryClient();
  const { user, isHydrated } = useAuth();
  const warmedRoutesRef = React.useRef(new Set<string>());
  const primaryRoutesRef = React.useRef<string[]>([]);

  const warmRoute = React.useCallback(
    (href: string) => {
      if (!isHydrated || !user) {
        return;
      }

      const baseHref = href.split('?')[0] ?? href;

      if (warmedRoutesRef.current.has(baseHref)) {
        return;
      }

      warmedRoutesRef.current.add(baseHref);

      if (baseHref === '/dashboard/cosaf') {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.clientProfiles(1, {
            agentId: undefined,
            branchCode: undefined,
            product: undefined,
            search: undefined,
            status: undefined,
          }),
          queryFn: () => fetchClientProfiles(1, {}),
          staleTime: 10 * 60 * 1000,
        });

        if (user.role !== 'Agent') {
          void queryClient.prefetchQuery({
            queryKey: queryKeys.cosafApprovals,
            queryFn: fetchCosafApprovals,
            staleTime: 10 * 60 * 1000,
          });
        }

        return;
      }

      if (baseHref === '/dashboard/cosaf/reassign' && user.role !== 'Agent') {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.clientProfiles(1, {
            agentId: undefined,
            branchCode: undefined,
            product: undefined,
            search: undefined,
            status: 'Orphan',
          }),
          queryFn: () => fetchClientProfiles(1, { status: 'Orphan' }, 24),
          staleTime: 10 * 60 * 1000,
        });
        void queryClient.prefetchQuery({
          queryKey: queryKeys.agentLookup('all'),
          queryFn: () => fetchAgents(''),
          staleTime: 10 * 60 * 1000,
        });
        return;
      }

      if (baseHref === '/dashboard/documents') {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.documents('all::all:active'),
          queryFn: () => fetchDocuments(),
          staleTime: 10 * 60 * 1000,
        });
        return;
      }

      if (baseHref === '/dashboard/lapsation') {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.lapsation,
          queryFn: fetchLapsationDashboard,
          staleTime: 10 * 60 * 1000,
        });
        return;
      }

      if (baseHref === '/dashboard/performance') {
        const { month, year } = getCurrentReportingWindow();
        void queryClient.prefetchQuery({
          queryKey: queryKeys.metrics('all', month, year),
          queryFn: () => fetchPerformanceMetrics(month, year),
          staleTime: 10 * 60 * 1000,
        });
        void queryClient.prefetchQuery({
          queryKey: queryKeys.performanceLeaderboard(month, year),
          queryFn: () => fetchPerformanceLeaderboard(month, year),
          staleTime: 10 * 60 * 1000,
        });
        return;
      }

      if (baseHref === '/dashboard/prospects') {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.prospects('{}'),
          queryFn: () => fetchProspects({}),
          staleTime: 10 * 60 * 1000,
        });
      }
    },
    [isHydrated, queryClient, user],
  );

  const warmPrimaryRoutes = React.useCallback(
    (hrefs: readonly string[]) => {
      if (!isHydrated || !user) {
        return;
      }

      const nextPrimaryRoutes = hrefs.filter((href) => href !== '/dashboard');

      if (
        primaryRoutesRef.current.length === nextPrimaryRoutes.length &&
        primaryRoutesRef.current.every((href, index) => href === nextPrimaryRoutes[index])
      ) {
        return;
      }

      primaryRoutesRef.current = nextPrimaryRoutes;
      nextPrimaryRoutes.slice(0, 2).forEach((href) => {
        warmRoute(href);
      });
    },
    [isHydrated, user, warmRoute],
  );

  React.useEffect(() => {
    primaryRoutesRef.current = [];
  }, [user?.role]);

  return { warmPrimaryRoutes, warmRoute };
}
