'use client';

import * as React from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { PanelLeftClose } from 'lucide-react';

import { useDashboardNavigation } from '@/components/layouts/dashboard-navigation-context';
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
  const router = useRouter();
  const { items } = useNavigation();
  const { navigate, pendingHref } = useDashboardNavigation();

  React.useEffect(() => {
    items.forEach((item) => {
      router.prefetch(item.href as Route);
    });
  }, [items, router]);

  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-1 px-2">
      {items.map((item) => {
        const isActive =
          item.matchMode === 'exact'
            ? pathname === item.href
            : pathname === item.href || pathname?.startsWith(`${item.href}/`);
        const isPending = pendingHref === item.href;

        return (
          <Link
            key={item.href}
            href={item.href as Route}
            prefetch
            onClick={(event) => {
              if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }

              event.preventDefault();
              navigate(item.href, onNavigate);
            }}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              isActive
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              isPending && 'scale-[0.99] bg-accent text-accent-foreground shadow-soft',
              collapsed && 'justify-center px-2 py-3',
            )}
            title={collapsed ? item.label : undefined}
          >
            <span
              className={cn(
                'pointer-events-none absolute inset-y-1 left-1 w-1 rounded-full bg-primary transition-all duration-200',
                isActive || isPending ? 'opacity-100' : 'opacity-0',
              )}
            />
            <item.icon
              className={cn('h-5 w-5 shrink-0 transition-colors', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')}
              aria-hidden="true"
            />
            <span className={cn('min-w-0 flex-1', collapsed && 'hidden')}>
              <span className="block truncate">{item.label}</span>
            </span>
            {isPending ? (
              <span className="absolute inset-0 overflow-hidden rounded-xl">
                <span className="absolute inset-y-0 left-[-35%] w-1/3 bg-white/20 blur-xl animate-[sidebarShimmer_0.9s_ease-in-out_infinite]" />
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export { NavigationList };

export function DashboardSidebar({ collapsed, onToggleCollapsed }: DashboardSidebarProps) {
  return (
    <aside className="hidden lg:flex lg:w-[280px] lg:flex-col lg:border-r lg:bg-background/95 lg:backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full flex-col gap-4 p-4">
        <div className="flex h-[60px] items-center gap-3 px-2">
          <div className={cn('flex flex-col', collapsed && 'hidden')}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              A1 Prime
            </span>
            <span className="text-lg font-semibold tracking-tight">Workspace</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleCollapsed}
            className="ml-auto h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <PanelLeftClose
              className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')}
            />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <NavigationList collapsed={collapsed} />
        </div>
      </div>
    </aside>
  );
}
