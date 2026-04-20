import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BellRing,
  LayoutDashboard,
  ShieldCheck,
  Users,
  AlertTriangle,
  Trophy,
  Library,
  ArrowRightLeft,
  UploadCloud,
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
    href: '/dashboard/cosaf/import',
    label: 'COSAF Import',
    description: 'Import and stage COSAF-related branch files.',
    icon: UploadCloud,
    allowedRoles: ['Admin', 'BranchManager'],
    matchMode: 'startsWith',
  },
  {
    href: '/dashboard/cosaf/reassign',
    label: 'Reassign Clients',
    description: 'Move client ownership between agents without manual IDs.',
    icon: ArrowRightLeft,
    allowedRoles: ['Admin', 'BranchManager'],
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
  {
    href: '/dashboard/admin/notifications',
    label: 'Notifications',
    description: 'Review Gmail queue and delivery audit logs.',
    icon: BellRing,
    allowedRoles: ['Admin'],
    matchMode: 'startsWith',
  },
  {
    href: '/dashboard/lapsation',
    label: 'Lapsation',
    description: 'Track at-risk policies and reinstatements.',
    icon: AlertTriangle,
    allowedRoles: ['Admin', 'BranchManager', 'Agent'],
    matchMode: 'startsWith',
  },
  {
    href: '/dashboard/performance',
    label: 'Performance',
    description: 'Agent leaderboards and KPI tracking.',
    icon: Trophy,
    allowedRoles: ['Admin', 'BranchManager'],
    matchMode: 'startsWith',
  },
  {
    href: '/dashboard/documents',
    label: 'Documents',
    description: 'Branch form library and templates.',
    icon: Library,
    allowedRoles: ['Admin', 'BranchManager', 'Agent'],
    matchMode: 'startsWith',
  },
] as const;

export function getNavigationItemsForRole(role?: SystemRole | null) {
  if (!role) {
    return dashboardNavigationItems;
  }

  return dashboardNavigationItems.filter((item) => item.allowedRoles.includes(role));
}
