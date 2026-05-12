'use client';

import * as React from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import {
  ClipboardList,
  FileSpreadsheet,
  KeyRound,
  RotateCcw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { Command } from 'cmdk';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useAdminSearch } from '@/features/admin/hooks/use-admin-search';
import { useGetAdminOverview } from '@/features/admin/hooks/use-get-admin-overview';
import { useGetAdminSystemLogs } from '@/features/admin/hooks/use-get-admin-system-logs';

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

const ADMIN_PRIMARY_ACTIONS = [
  {
    title: 'Create account',
    description: 'Add Admin, Branch Manager, or Agent access with the required onboarding rules.',
    href: '/dashboard/admin/users',
    cta: 'Manage users',
    icon: UserPlus,
  },
  {
    title: 'Reset password',
    description: 'Issue a temporary credential and keep the access-change event auditable.',
    href: '/dashboard/admin/users',
    cta: 'Open password controls',
    icon: KeyRound,
  },
  {
    title: 'Delist agent',
    description: 'Move clients into orphan handling, then reassign without losing history.',
    href: '/dashboard/cosaf/reassign',
    cta: 'Open reassignment',
    icon: RotateCcw,
  },
  {
    title: 'Review logs',
    description: 'Check uploads, returns, approvals, reassignments, and notifications.',
    href: '/dashboard/admin/notifications',
    cta: 'Open logs',
    icon: ClipboardList,
  },
] as const;

const ADMIN_WORK_AREAS = [
  {
    title: 'User Management',
    description: 'Create, edit, archive, restore, and reset user accounts.',
    href: '/dashboard/admin/users',
  },
  {
    title: 'Data Center',
    description: 'Policies, NAP, recruitment, persistency, plan codes, validation, and reports.',
    href: '/dashboard/admin/data-center',
  },
  {
    title: 'System Logs',
    description: 'Notification and operational activity review.',
    href: '/dashboard/admin/notifications',
  },
] as const;

function useCommandPalette(open: boolean, onOpenChange: (next: boolean) => void) {
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!open);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange, open]);
}

export function AdminHome() {
  const [isCommandOpen, setIsCommandOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const router = useRouter();
  useCommandPalette(isCommandOpen, setIsCommandOpen);

  const overviewQuery = useGetAdminOverview();
  const logsQuery = useGetAdminSystemLogs();
  const searchQuery = useAdminSearch(search, isCommandOpen);

  const recentLogs = logsQuery.data?.data.slice(0, 6) ?? [];

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase text-brand/75">Admin</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Admin quick actions
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Find common admin work fast: user access, password resets, agent delisting, global
              search, logs, and Data Center tables.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCommandOpen(true)}
            className="inline-flex min-h-12 items-center rounded-md border border-white/50 bg-background/85 px-5 text-sm font-medium text-foreground shadow-soft dark:border-white/10 dark:bg-white/[0.04]"
          >
            <Search className="mr-3 h-4 w-4 text-muted-foreground" />
            Search agents and clients
            <span className="ml-4 inline-flex items-center rounded-md border border-white/50 px-3 py-1 text-xs font-semibold uppercase text-muted-foreground dark:border-white/10">
              Ctrl+K
            </span>
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Quick actions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open the most common admin tasks without hunting through menus.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ADMIN_PRIMARY_ACTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title}>
                <CardHeader>
                  <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-md bg-brand-gradient-soft">
                    <Icon className="h-5 w-5 text-brand" />
                  </div>
                  <CardDescription>Quick action</CardDescription>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <Link
                    href={item.href as Route}
                    className="mt-4 inline-flex min-h-11 items-center rounded-md border border-white/50 px-4 text-sm font-medium shadow-soft dark:border-white/10"
                  >
                    {item.cta}
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewQuery.isPending ? (
          <LoadingSkeleton rows={1} columns={4} />
        ) : overviewQuery.data ? (
          [
            ['Active users', overviewQuery.data.totals.activeUsers],
            ['Active agents', overviewQuery.data.totals.activeAgents],
            ['Orphan clients', overviewQuery.data.totals.orphanClients],
            ['Pending approvals', overviewQuery.data.totals.pendingApprovals],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-3 text-3xl font-semibold text-foreground">{value}</p>
              </CardContent>
            </Card>
          ))
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-brand-gradient-soft p-3">
                <FileSpreadsheet className="h-5 w-5 text-brand" />
              </div>
              <div>
                <CardTitle className="text-xl">Main admin work areas</CardTitle>
                <CardDescription>Three places cover the Phase 6 admin responsibilities.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            {ADMIN_WORK_AREAS.map((item) => (
              <Link
                key={item.title}
                href={item.href as Route}
                className="rounded-md border border-white/40 bg-background/75 p-4 text-left shadow-soft dark:border-white/10"
              >
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </Link>
            ))}
            <button
              type="button"
              onClick={() => setIsCommandOpen(true)}
              className="rounded-md border border-white/40 bg-brand-gradient-soft p-4 text-left shadow-soft dark:border-white/10"
            >
              <p className="font-semibold text-foreground">Search agents and clients</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Use this when you already know the person, agent code, client, or case you need.
              </p>
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-brand-gradient-soft p-3">
                <ShieldCheck className="h-5 w-5 text-brand" />
              </div>
              <div>
                <CardTitle className="text-xl">Recent system logs</CardTitle>
                <CardDescription>Latest operational events from the notification and system activity surface.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {logsQuery.isPending ? (
              <LoadingSkeleton rows={4} columns={2} />
            ) : logsQuery.errorMessage ? (
              <EmptyState
                icon={ShieldCheck}
                title="System logs unavailable"
                description={logsQuery.errorMessage}
              />
            ) : recentLogs.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="No recent system logs"
                description="Recent operational activity will appear here once background work is recorded."
              />
            ) : (
              recentLogs.map((log: (typeof recentLogs)[number]) => (
                <div
                  key={log.id}
                  className="rounded-[24px] border border-white/40 bg-background/75 p-4 shadow-soft dark:border-white/10"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">{log.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{log.description}</p>
                    </div>
                    <span className="rounded-full bg-brand-gradient-soft px-3 py-1 text-xs font-semibold text-brand">
                      {log.category}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{formatDate(log.createdAtUtc)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <DialogContent className="max-w-2xl overflow-hidden border-white/50 bg-background/95 p-0 shadow-float dark:border-white/10">
          <DialogTitle className="sr-only">Global system search</DialogTitle>
          <Command className="overflow-hidden rounded-[28px]">
            <div className="flex items-center gap-3 border-b border-white/40 px-4 py-4 dark:border-white/10">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Search agents or client profiles..."
                className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Command.List className="max-h-[440px] overflow-y-auto p-3">
              <Command.Empty className="px-3 py-6 text-sm text-muted-foreground">
                No matching agents or client profiles.
              </Command.Empty>

              <Command.Group heading="Agents">
                {searchQuery.data?.data
                  .filter((item) => item.type === 'agent')
                  .map((agent) => (
                  <Command.Item
                    key={agent.id}
                    value={`${agent.title} ${agent.subtitle}`}
                    onSelect={() => {
                      setIsCommandOpen(false);
                      router.push(agent.href as Route);
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-2xl px-3 py-3 text-sm data-[selected=true]:bg-brand-gradient-soft"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{agent.title}</p>
                      <p className="text-xs uppercase text-muted-foreground">
                        {agent.subtitle}
                      </p>
                    </div>
                    <Users className="h-4 w-4 text-brand" />
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="Clients">
                {searchQuery.data?.data
                  .filter((item) => item.type === 'client')
                  .map((client) => (
                  <Command.Item
                    key={client.id}
                    value={`${client.title} ${client.subtitle}`}
                    onSelect={() => {
                      setIsCommandOpen(false);
                      router.push(client.href as Route);
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-2xl px-3 py-3 text-sm data-[selected=true]:bg-brand-gradient-soft"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{client.title}</p>
                      <p className="text-xs uppercase text-muted-foreground">
                        {client.subtitle}
                      </p>
                    </div>
                    <Search className="h-4 w-4 text-brand" />
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}
