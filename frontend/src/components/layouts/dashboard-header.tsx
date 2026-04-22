'use client';

import { Bell, ChevronDown, LogOut, Search } from 'lucide-react';

import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/identity';
import { useLogout } from '@/features/identity/hooks/use-logout';

interface DashboardHeaderProps {
  navigationTrigger: React.ReactNode;
}

function getUserInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim().toUpperCase() || 'AU';
}

export function DashboardHeader({ navigationTrigger }: DashboardHeaderProps) {
  const { user } = useAuth();
  const logout = useLogout();
  const userName = user ? `${user.firstName} ${user.lastName}` : 'Authenticated User';

  return (
    <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6">
      <div className="glass-panel flex min-h-20 items-center gap-3 rounded-[28px] px-4 py-3 sm:px-5">
        <div className="shrink-0">{navigationTrigger}</div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand/75">
            Branch Dashboard
          </p>
          <h2 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Good to see you, {user?.firstName ?? 'team'}
          </h2>
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-white/50 bg-background/70 px-4 py-2 text-sm text-muted-foreground shadow-soft backdrop-blur-sm dark:border-white/10 dark:bg-background/70 xl:flex">
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="whitespace-nowrap">Quick actions coming soon</span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeSwitcher />

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-full border-white/50 bg-background/70 shadow-soft backdrop-blur-sm dark:border-white/10 dark:bg-background/70"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-12 gap-3 rounded-full border-white/50 bg-background/72 px-3 shadow-soft backdrop-blur-sm dark:border-white/10 dark:bg-background/72"
              aria-label="Open user menu"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-brand-foreground shadow-soft">
                {getUserInitials(user?.firstName, user?.lastName)}
              </span>
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block truncate text-sm font-medium text-foreground">
                  {userName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {user?.role ?? 'No role'}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 rounded-3xl border-white/60 bg-popover/95 p-2 shadow-float backdrop-blur-xl dark:border-white/10"
          >
            <DropdownMenuLabel className="pb-1">
              <span className="block text-sm font-semibold text-foreground">{userName}</span>
              <span className="block pt-1 text-xs font-normal text-muted-foreground">
                {user?.email ?? 'No email available'}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="min-h-11 rounded-2xl">
              <span className="flex flex-col">
                <span className="font-medium text-foreground">Current access</span>
                <span className="text-xs text-muted-foreground">
                  {user?.role ?? 'Pending role'}
                </span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="min-h-11 rounded-2xl text-destructive focus:bg-destructive/10 focus:text-destructive"
              onSelect={() => void logout()}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
