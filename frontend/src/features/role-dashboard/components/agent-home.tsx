'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { AlertTriangle, BriefcaseBusiness, Clock3, FileUp, PhoneCall } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useGetAgentDashboard } from '../hooks/use-get-agent-dashboard';

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);
}

const iconByAction = {
  'Update contact status': PhoneCall,
  'Upload COSAF docs': FileUp,
  'Open at-risk queue': AlertTriangle,
  'Open prospects': BriefcaseBusiness,
} as const;

const DEFAULT_AGENT_QUICK_ACTIONS = [
  {
    label: 'Update contact status',
    description: 'Open assigned client cases and record the latest contact progress.',
    href: '/dashboard/cosaf',
  },
  {
    label: 'Upload COSAF docs',
    description: 'Submit signed forms and supporting files for active reassignment cases.',
    href: '/dashboard/cosaf',
  },
  {
    label: 'Open at-risk queue',
    description: 'Review warning, urgent, and lapsed policies that need follow-up.',
    href: '/dashboard/lapsation',
  },
  {
    label: 'Open prospects',
    description: 'Move leads through your prospecting pipeline.',
    href: '/dashboard/prospects',
  },
] as const;

export function AgentHome() {
  const dashboardQuery = useGetAgentDashboard();

  if (dashboardQuery.isPending) {
    return <LoadingSkeleton rows={5} columns={4} />;
  }

  if (!dashboardQuery.data || dashboardQuery.errorMessage) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Agent dashboard unavailable"
        description={dashboardQuery.errorMessage ?? 'We could not load your agent workspace.'}
      />
    );
  }

  const { agent, summary, assignedClients, recentHistory, atRiskPolicies, prospects, quickActions } =
    dashboardQuery.data;
  const visibleQuickActions =
    quickActions.length > 0 ? quickActions : DEFAULT_AGENT_QUICK_ACTIONS;

  return (
    <div className="space-y-6">
      <section className="floating-card relative overflow-hidden bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
          Agent Workspace
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Quick actions for {agent.displayName}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Jump to the work you need most: client updates, COSAF uploads, at-risk policies, and
          prospect follow-ups for branch {agent.branchCode}.
        </p>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Quick actions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Start here when you need to locate a task quickly.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          {visibleQuickActions.map((action: (typeof visibleQuickActions)[number]) => {
            const Icon = iconByAction[action.label as keyof typeof iconByAction] ?? Clock3;

            return (
              <Link key={action.label} href={action.href as Route} className="block">
                <Card className="h-full transition-transform hover:-translate-y-0.5">
                  <CardHeader>
                    <Icon className="h-5 w-5 text-brand" />
                    <CardDescription>Quick action</CardDescription>
                    <CardTitle className="text-xl">{action.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {([
          ['Persistency', `${summary.persistency}%`],
          ['Active policies', String(summary.activePolicies)],
          [
            'Total API / APE',
            `${formatCurrency(summary.totalApi)} / ${formatCurrency(summary.totalApe)}`,
          ],
          ['Policy count', String(summary.policyCount)],
          ['Recruitment summary', String(summary.recruitmentCount)],
          [
            'At-risk policies',
            `${summary.warningPolicies} warning / ${summary.urgentPolicies} urgent / ${summary.lapsedPolicies} lapsed`,
          ],
        ] as const).map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Assigned Clients</CardTitle>
            <CardDescription>Only clients currently assigned to you are shown here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignedClients.length === 0 ? (
              <EmptyState
                icon={PhoneCall}
                title="No assigned clients"
                description="Client assignments will appear here as soon as they are mapped to your portfolio."
              />
            ) : (
              assignedClients
                .slice(0, 8)
                .map((client: (typeof assignedClients)[number]) => (
                  <div
                    key={client.id}
                    className="rounded-[24px] border border-white/40 bg-background/75 p-4 dark:border-white/10"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-foreground">{client.clientName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {client.policyNumber} | {client.status}
                        </p>
                      </div>
                      <p className="text-xs uppercase tracking-[0.18em] text-brand/75">
                        {client.productType ?? client.planCode ?? 'No product tag'}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/25 bg-destructive/5 dark:bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-xl">At-Risk Policies</CardTitle>
            <CardDescription>
              Only your warning, urgent, and lapsed policies are included.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {atRiskPolicies.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="No at-risk policies"
                description="Your current portfolio has no warning, urgent, or lapsed policies."
              />
            ) : (
              atRiskPolicies
                .slice(0, 6)
                .map((policy: (typeof atRiskPolicies)[number]) => (
                  <div
                    key={policy.id}
                    className="rounded-[24px] border border-destructive/20 bg-background/80 p-4 dark:border-white/10 dark:bg-black/20"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-foreground">{policy.clientName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {policy.policyNumber} | {policy.daysSinceLapse} days since lapse
                        </p>
                      </div>
                      <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-destructive">
                        {policy.riskLevel}
                      </span>
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Client History You Own</CardTitle>
            <CardDescription>
              Assignment history tied to your owned clients and transfers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentHistory.length === 0 ? (
              <EmptyState
                icon={Clock3}
                title="No ownership history yet"
                description="Client transfer history will populate here as reassignment events happen."
              />
            ) : (
              recentHistory.map((entry: (typeof recentHistory)[number]) => (
                <div
                  key={entry.id}
                  className="rounded-[24px] border border-white/40 bg-background/75 p-4 dark:border-white/10"
                >
                  <p className="font-semibold text-foreground">{entry.summary}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {new Date(entry.timestampUtc).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Prospect Pipeline</CardTitle>
            <CardDescription>
              Warm and cold remain labels, while these counts track the actual pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {([
              ['Total', prospects.total],
              ['Contacted', prospects.contacted],
              ['Client Agreed', prospects.clientAgreed],
              ['Presentation', prospects.presentation],
              ['Approved', prospects.approved],
              ['Closed', prospects.closed],
            ] as const).map(([label, value]) => (
              <div
                key={label}
                className="rounded-[24px] border border-white/40 bg-background/75 p-4 dark:border-white/10"
              >
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
