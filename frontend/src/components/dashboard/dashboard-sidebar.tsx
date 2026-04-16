'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { PanelLeftClose } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/identity';
import { cn } from '@/lib/utils';
import { getNavigationItemsForRole } from '@/features/navigation/config/navigation';

interface DashboardSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

function NavigationList({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const items = getNavigationItemsForRole(user?.role);

  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-2">
      {items.map((item) => {
        const isActive =
          item.matchMode === 'exact'
            ? pathname === item.href
            : pathname === item.href || pathname?.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href as Route}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'group flex min-h-12 items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isActive
                ? 'border-primary/15 bg-primary text-primary-foreground shadow-sm [&>span]:text-primary-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:bg-background hover:text-foreground',
              collapsed && 'justify-center px-2',
            )}
            title={collapsed ? item.label : undefined}
          >
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                isActive
                  ? 'bg-primary-foreground/10 text-primary-foreground'
                  : 'bg-accent text-foreground group-hover:bg-primary/10 group-hover:text-primary',
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className={cn('min-w-0 flex-1', collapsed && 'hidden')}>
              <span
                className={cn(
                  'block truncate font-medium',
                  isActive ? 'text-primary-foreground' : 'text-foreground',
                )}
              >
                {item.label}
              </span>
              <span
                className={cn(
                  'mt-0.5 block truncate text-xs',
                  isActive ? 'text-primary-foreground/80' : 'text-muted-foreground',
                )}
              >
                {item.description}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export { NavigationList };

export function DashboardSidebar({ collapsed, onToggleCollapsed }: DashboardSidebarProps) {
  return (
    <aside className="hidden lg:flex lg:w-[280px] lg:flex-col lg:border-r lg:border-border/70 lg:bg-sidebar/80 lg:px-4 lg:py-6">
      <div className="mb-6 flex items-center justify-between gap-3 px-2">
        <div className={cn('min-w-0', collapsed && 'hidden')}>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">
            A1 Prime
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            Branch Workspace
          </h1>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="h-11 w-11 shrink-0 rounded-2xl"
        >
          <PanelLeftClose
            className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')}
            aria-hidden="true"
          />
        </Button>
      </div>

      {!collapsed ? (
        <p className="mb-6 px-2 text-sm leading-6 text-muted-foreground">
          Move between operational views, performance tracking, and administrative work without
          losing context.
        </p>
      ) : null}

      <NavigationList collapsed={collapsed} />
    </aside>
  );
}
