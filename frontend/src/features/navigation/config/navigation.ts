import type { LucideIcon } from 'lucide-react';
import { BarChart3, LayoutDashboard, ShieldCheck, Users } from 'lucide-react';
import type { SystemRole } from '@a1prime/schemas';

export interface NavigationItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  allowedRoles: readonly SystemRole[];
  matchMode?: 'exact' | 'startsWith';
}

export const dashboardNavigationItems: readonly NavigationItem[] = [
  {
    href: '/dashboard',
    label: 'Overview',
    description: 'Branch performance snapshot and recent activity.',
    icon: LayoutDashboard,
    allowedRoles: ['Admin', 'BranchManager', 'Agent'],
    matchMode: 'exact',
  },
  {
    href: '/dashboard/cosaf',
    label: 'Client Profiles',
    description: 'Review COSAF profiles and ownership status.',
    icon: Users,
    allowedRoles: ['Admin', 'BranchManager', 'Agent'],
    matchMode: 'startsWith',
  },
  {
    href: '/dashboard/metrics',
    label: 'Performance',
    description: 'Track KPIs, trends, and production metrics.',
    icon: BarChart3,
    allowedRoles: ['Admin', 'BranchManager', 'Agent'],
    matchMode: 'startsWith',
  },
  {
    href: '/dashboard/admin/users',
    label: 'User Management',
    description: 'Manage system access, roles, and account lifecycle.',
    icon: ShieldCheck,
    allowedRoles: ['Admin'],
    matchMode: 'startsWith',
  },
] as const;

export function getNavigationItemsForRole(role?: SystemRole | null) {
  if (!role) {
    return dashboardNavigationItems;
  }

  return dashboardNavigationItems.filter((item) => item.allowedRoles.includes(role));
}
