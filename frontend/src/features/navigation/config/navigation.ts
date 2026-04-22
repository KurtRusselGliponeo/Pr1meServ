import type { LucideIcon } from 'lucide-react';
import {
  BellRing,
  LayoutDashboard,
  ShieldCheck,
  Users,
  AlertTriangle,
  Trophy,
  Library,
} from 'lucide-react';
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
    description: 'Branch snapshot and urgent tasks.',
    icon: LayoutDashboard,
    allowedRoles: ['Admin', 'BranchManager', 'Agent'],
    matchMode: 'exact',
  },
  {
    href: '/dashboard/cosaf',
    label: 'Client Reassignment',
    description: 'Manage orphan clients and COSAF approvals.',
    icon: Users,
    allowedRoles: ['Admin', 'BranchManager', 'Agent'],
    matchMode: 'startsWith',
  },
  {
    href: '/dashboard/lapsation',
    label: 'Lapsation Tracker',
    description: 'Monitor and rescue at-risk policies.',
    icon: AlertTriangle,
    allowedRoles: ['Admin', 'BranchManager', 'Agent'],
    matchMode: 'startsWith',
  },
  {
    href: '/dashboard/performance',
    label: 'Performance Leaderboard',
    description: 'Track agent rankings and KPIs.',
    icon: Trophy,
    allowedRoles: ['Admin', 'BranchManager'],
    matchMode: 'startsWith',
  },
  {
    href: '/dashboard/documents',
    label: 'Document Library',
    description: 'Access branch forms and templates.',
    icon: Library,
    allowedRoles: ['Admin', 'BranchManager', 'Agent'],
    matchMode: 'startsWith',
  },
  {
    href: '/dashboard/admin/users',
    label: 'User Management',
    description: 'Manage system access and roles.',
    icon: ShieldCheck,
    allowedRoles: ['Admin'],
    matchMode: 'startsWith',
  },
  {
    href: '/dashboard/admin/notifications',
    label: 'System Logs',
    description: 'Review notification and delivery logs.',
    icon: BellRing,
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
