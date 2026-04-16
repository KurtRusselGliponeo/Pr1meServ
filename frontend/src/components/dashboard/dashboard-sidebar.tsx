'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { PanelLeftClose } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useNavigation } from '@/features/navigation/hooks/use-navigation';
import { cn } from '@/lib/utils';

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
  const { items } = useNavigation();

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
              'group flex min-h-12 items-center gap-3 rounded-3xl border px-3 py-3 text-sm transition-all duration-300 ease-smooth',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isActive
                ? 'border-brand/20 bg-brand-gradient text-brand-foreground shadow-soft [&>span]:text-brand-foreground'
                : 'border-transparent text-muted-foreground hover:border-white/60 hover:bg-white/55 hover:text-foreground dark:hover:border-white/10 dark:hover:bg-white/5',
              collapsed && 'justify-center px-2',
            )}
            title={collapsed ? item.label : undefined}
          >
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                isActive
                  ? 'bg-white/15 text-brand-foreground'
                  : 'bg-brand-gradient-soft text-foreground group-hover:bg-brand-gradient-soft group-hover:text-brand',
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
    <aside className="hidden lg:flex lg:w-[300px] lg:flex-col lg:px-4 lg:py-4">
      <div
        className={cn(
          'floating-card sticky top-4 flex h-[calc(100vh-2rem)] flex-col p-4',
          collapsed && 'items-center',
        )}
      >
        <div className="mb-6 flex items-center justify-between gap-3 px-2">
          <div className={cn('min-w-0', collapsed && 'hidden')}>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
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
            className="h-11 w-11 shrink-0 rounded-full"
          >
            <PanelLeftClose
              className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')}
              aria-hidden="true"
            />
          </Button>
        </div>

        {!collapsed ? (
          <p className="mb-6 rounded-3xl bg-brand-gradient-soft px-4 py-4 text-sm leading-6 text-muted-foreground">
            Move between operational views, performance tracking, and administrative work without
            losing context.
          </p>
        ) : null}

        <div className="flex-1 overflow-y-auto pr-1">
          <NavigationList collapsed={collapsed} />
        </div>
      </div>
    </aside>
  );
}
