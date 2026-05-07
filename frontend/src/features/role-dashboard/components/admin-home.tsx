'use client';

import * as React from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Command as CommandIcon, Search, ShieldCheck, Users } from 'lucide-react';
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
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
              Admin
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              System governance and global search
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Search across agents and clients instantly, then review the latest platform activity and control surfaces.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCommandOpen(true)}
            className="inline-flex min-h-12 items-center rounded-full border border-white/50 bg-background/85 px-5 text-sm font-medium text-foreground shadow-soft dark:border-white/10 dark:bg-white/[0.04]"
          >
            <Search className="mr-3 h-4 w-4 text-muted-foreground" />
            Global search
            <span className="ml-4 inline-flex items-center rounded-full border border-white/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground dark:border-white/10">
              Ctrl+K
            </span>
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          {
            step: 'Quick action',
            title: 'Policy records',
            description: 'View, manually add, and edit per-policy closed deal records for any agent.',
            href: '/dashboard/admin/policies',
            cta: 'Open policy records',
          },
          {
            step: 'Quick action',
            title: 'Data Center',
            description: 'Jump into the unified admin workspace for policies, NAP, recruitment, persistency, and reference operations.',
            href: '/dashboard/admin/data-center',
            cta: 'Open Data Center',
          },
          {
            step: 'Quick action',
            title: 'Recruitments',
            description: 'Track recruit onboarding, recruiter hierarchy, and appointment lifecycle with metric-linked manual records.',
            href: '/dashboard/admin/recruitments',
            cta: 'Open recruitment management',
          },
          {
            step: 'Quick action',
            title: 'NAP transactions',
            description: 'Create and update manual NAP entries that apply policy effects and refresh production metrics.',
            href: '/dashboard/admin/nap-transactions',
            cta: 'Open NAP management',
          },
          {
            step: 'Quick action',
            title: 'Create account',
            description: 'Provision Admin, Branch Manager, and Agent accounts with the locked onboarding rules.',
            href: '/dashboard/admin/users',
            cta: 'Create and manage users',
          },
          {
            step: 'Quick action',
            title: 'Reset password',
            description: 'Force a secure temporary credential and preserve the reset event in the audit trail.',
            href: '/dashboard/admin/users',
            cta: 'Open password controls',
          },
          {
            step: 'Quick action',
            title: 'Delist agent',
            description: 'Move active portfolios into the orphan queue, then reassign cleanly without losing history.',
            href: '/dashboard/cosaf/reassign',
            cta: 'Open orphan reassignment',
          },
          {
            step: 'Quick action',
            title: 'Review logs',
            description: 'Inspect uploads, returns, approvals, notifications, and reassignment events from one feed.',
            href: '/dashboard/admin/notifications',
            cta: 'Open recent logs',
          },
          {
            step: 'Quick action',
            title: 'Search agents and clients',
            description: 'Jump directly into operational records with live suggestions across agents and client cases.',
            href: '/dashboard/admin',
            cta: 'Use global search',
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardDescription>{item.step}</CardDescription>
              <CardTitle className="text-xl">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              <Link
                href={item.href as Route}
                className="mt-4 inline-flex min-h-11 items-center rounded-full border border-white/50 px-4 text-sm font-medium shadow-soft dark:border-white/10"
              >
                {item.cta}
              </Link>
            </CardContent>
          </Card>
        ))}
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

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-brand-gradient-soft p-3">
                <CommandIcon className="h-5 w-5 text-brand" />
              </div>
              <div>
                <CardTitle className="text-xl">Global system search</CardTitle>
                <CardDescription>Find agents and client profiles from one command surface.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <button
              type="button"
              onClick={() => setIsCommandOpen(true)}
              className="rounded-[24px] border border-white/40 bg-background/75 p-4 text-left shadow-soft dark:border-white/10"
            >
              <p className="font-semibold text-foreground">Open command menu</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Search agents by code or name, and jump directly into client and operational views.
              </p>
            </button>
            <Link href="/dashboard/admin/users" className="rounded-[24px] border border-white/40 bg-background/75 p-4 text-left shadow-soft dark:border-white/10">
              <p className="font-semibold text-foreground">User lifecycle controls</p>
              <p className="mt-2 text-sm text-muted-foreground">Manage users, reset credentials, and restore archived access.</p>
            </Link>
            <Link href="/dashboard/cosaf/reassign" className="rounded-[24px] border border-white/40 bg-background/75 p-4 text-left shadow-soft dark:border-white/10">
              <p className="font-semibold text-foreground">Branch oversight</p>
              <p className="mt-2 text-sm text-muted-foreground">Review orphan queues, reassignment activity, and live client workflow across branches.</p>
            </Link>
            <Link href="/dashboard/admin/notifications" className="rounded-[24px] border border-white/40 bg-background/75 p-4 text-left shadow-soft dark:border-white/10">
              <p className="font-semibold text-foreground">System logs</p>
              <p className="mt-2 text-sm text-muted-foreground">Review policy, upload, return, approval, reassignment, and notification activity.</p>
            </Link>
            <div className="rounded-[24px] border border-white/40 bg-brand-gradient-soft p-4 shadow-soft dark:border-white/10">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-brand" />
                <div>
                  <p className="font-semibold text-foreground">Recommended admin flow</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    1. Check logs. 2. Fix user access. 3. Search impacted agents or clients. 4. Review operational pages.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-brand-gradient-soft p-3">
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
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
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
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
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
