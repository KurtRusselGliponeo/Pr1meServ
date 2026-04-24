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
import { useGetNotificationLogs } from '@/features/admin/hooks/use-get-notification-logs';
import { useGetClientProfiles } from '@/features/phase-2-bm-workflow/hooks/use-get-client-profiles';
import { useGetAgents } from '@/features/phase-3-reassignment/hooks/use-get-agents';

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

  const logsQuery = useGetNotificationLogs();
  const agentsQuery = useGetAgents(search, isCommandOpen);
  const clientsQuery = useGetClientProfiles(
    1,
    { search },
    8,
    isCommandOpen,
  );

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
            step: 'Step 1',
            title: 'Check system health',
            description: 'Start by reviewing the latest notification activity so you can spot broken deliveries fast.',
            href: '/dashboard/admin/notifications',
            cta: 'Open notification logs',
          },
          {
            step: 'Step 2',
            title: 'Manage user access',
            description: 'Create, reset, archive, or restore accounts before people get blocked from their workflows.',
            href: '/dashboard/admin/users',
            cta: 'Open user management',
          },
          {
            step: 'Step 3',
            title: 'Search branch operations',
            description: 'Use global search to jump straight into agents and client records that need investigation.',
            href: '/dashboard/cosaf/reassign',
            cta: 'Open operations view',
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
            <Link href="/dashboard/admin/notifications" className="rounded-[24px] border border-white/40 bg-background/75 p-4 text-left shadow-soft dark:border-white/10">
              <p className="font-semibold text-foreground">Notification logs</p>
              <p className="mt-2 text-sm text-muted-foreground">Review queue outcomes, failures, and recent outbound activity.</p>
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
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-[24px] border border-white/40 bg-background/75 p-4 shadow-soft dark:border-white/10"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">{log.subject}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{log.recipient}</p>
                    </div>
                    <span className="rounded-full bg-brand-gradient-soft px-3 py-1 text-xs font-semibold text-brand">
                      {log.status}
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
                {agentsQuery.data?.data.map((agent) => (
                  <Command.Item
                    key={agent.id}
                    value={`${agent.displayName} ${agent.agentCode}`}
                    onSelect={() => {
                      setIsCommandOpen(false);
                      router.push(`/dashboard/agents/${agent.id}`);
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-2xl px-3 py-3 text-sm data-[selected=true]:bg-brand-gradient-soft"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{agent.displayName}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {agent.agentCode}
                      </p>
                    </div>
                    <Users className="h-4 w-4 text-brand" />
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="Clients">
                {clientsQuery.data?.data.slice(0, 8).map((client) => (
                  <Command.Item
                    key={client.id}
                    value={`${client.firstName} ${client.lastName} ${client.policyNumber}`}
                    onSelect={() => {
                      setIsCommandOpen(false);
                      router.push('/dashboard/cosaf/reassign');
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-2xl px-3 py-3 text-sm data-[selected=true]:bg-brand-gradient-soft"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {client.firstName} {client.lastName}
                      </p>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Policy {client.policyNumber}
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
