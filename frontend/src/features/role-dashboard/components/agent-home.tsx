'use client';

import * as React from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { AlertTriangle, ArrowRight, CheckCircle2, ShieldCheck, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useAuth } from '@/features/identity/context/auth-context';
import { useGetLapsationDashboard } from '@/features/phase-5-performance/hooks/use-get-lapsation-dashboard';

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatPersistency(atRiskCount: number, totalTracked: number) {
  if (totalTracked <= 0) {
    return 100;
  }

  return Math.max(0, Math.round(((totalTracked - atRiskCount) / totalTracked) * 100));
}

export function AgentHome() {
  const { user } = useAuth();
  const dashboardQuery = useGetLapsationDashboard();

  if (!user) {
    return null;
  }

  if (dashboardQuery.isPending) {
    return <LoadingSkeleton rows={4} columns={3} />;
  }

  if (!dashboardQuery.data || dashboardQuery.errorMessage) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Agent dashboard unavailable"
        description={dashboardQuery.errorMessage ?? 'We could not load your action board right now.'}
      />
    );
  }

  const atRiskRecords = dashboardQuery.data.records.filter(
    (record) => record.isAtRisk && !record.reinstatedAtUtc,
  );
  const persistencyRating = formatPersistency(
    dashboardQuery.data.summary.atRiskCount,
    dashboardQuery.data.summary.totalTracked,
  );

  return (
    <div className="space-y-6">
      <section className="floating-card relative overflow-hidden bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <div className="absolute inset-y-0 right-0 hidden w-72 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.6),transparent_62%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_62%)] lg:block" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/50 bg-brand-gradient-soft text-xl font-semibold text-brand shadow-soft dark:border-white/10">
              {getInitials(user.firstName, user.lastName)}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
                Agent Workspace
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                {user.firstName}, here is what needs action now
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Focus on at-risk cases first, then work through your open policies and branch follow-ups.
              </p>
            </div>
          </div>
          <div className="rounded-[28px] border border-white/50 bg-background/85 p-5 shadow-soft dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand/75">
              Persistency Rating
            </p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
              {persistencyRating}%
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Based on {dashboardQuery.data.summary.totalTracked} tracked policies and current at-risk volume.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          {
            step: 'Step 1',
            title: 'Review urgent policies',
            description: 'Start with high-risk policies so you clear the most urgent client follow-ups first.',
            href: '/dashboard/lapsation?filter=urgent',
            cta: 'Open urgent queue',
          },
          {
            step: 'Step 2',
            title: 'Resolve and update status',
            description: 'Mark reinstated records as soon as you close them so your queue stays accurate.',
            href: '/dashboard/lapsation',
            cta: 'Update lapsation tracker',
          },
          {
            step: 'Step 3',
            title: 'Check your production pulse',
            description: 'Review your performance view after follow-ups so you can track your month clearly.',
            href: '/dashboard/performance',
            cta: 'View performance',
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardDescription>{item.step}</CardDescription>
              <CardTitle className="text-xl">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              <Button asChild variant="outline" className="mt-4 min-h-11 rounded-full">
                <Link href={item.href as Route}>{item.cta}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-destructive/30 bg-destructive/5 dark:bg-destructive/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-destructive/15 p-3 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">At Risk Right Now</CardTitle>
                <CardDescription>
                  Policies sourced from the active NAP-backed lapsation feed that need immediate follow-up.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {atRiskRecords.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="No at-risk policies right now"
                description="Your current book is clear. Keep an eye on new lapsation signals as they arrive."
              />
            ) : (
              atRiskRecords.slice(0, 6).map((record) => (
                <div
                  key={record.id}
                  className="rounded-[24px] border border-destructive/20 bg-background/80 p-4 dark:border-white/10 dark:bg-black/20"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">{record.clientName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Policy {record.policyNumber}
                      </p>
                    </div>
                    <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-destructive">
                      {record.riskLevel}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">My Next Best Moves</CardTitle>
            <CardDescription>Follow this order to keep the day simple and consistent.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Link href="/dashboard/lapsation" className="block">
              <div className="rounded-[24px] border border-white/50 bg-brand-gradient-soft p-5 shadow-soft transition-transform hover:-translate-y-0.5 dark:border-white/10">
                <TrendingUp className="h-5 w-5 text-brand" />
                <p className="mt-3 font-semibold text-foreground">Open lapsation tracker</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Work the full at-risk queue and mark policies reinstated as you close them.
                </p>
              </div>
            </Link>
            <Link href="/dashboard/performance" className="block">
              <div className="rounded-[24px] border border-white/50 bg-background/85 p-5 shadow-soft transition-transform hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.04]">
                <ShieldCheck className="h-5 w-5 text-brand" />
                <p className="mt-3 font-semibold text-foreground">Review performance pulse</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Track your production trend and branch standing without leaving the dashboard.
                </p>
              </div>
            </Link>
            <Button asChild className="min-h-12 rounded-full">
              <Link href="/dashboard/lapsation">
                Work at-risk queue <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <div className="rounded-[24px] border border-white/50 bg-background/75 p-4 dark:border-white/10">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-brand" />
                <div>
                  <p className="font-semibold text-foreground">Daily workflow</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    1. Open urgent queue. 2. Resolve calls and reinstatements. 3. Check performance before you sign off.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
