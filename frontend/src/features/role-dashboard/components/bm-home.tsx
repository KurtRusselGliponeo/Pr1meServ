'use client';

import * as React from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Trophy, Users } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useGetPerformanceLeaderboard } from '@/features/phase-5-performance/hooks/use-get-performance-leaderboard';
import { useGetOrphanClients } from '../hooks/use-get-orphan-clients';

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function BMHome() {
  const now = new Date();
  const leaderboardQuery = useGetPerformanceLeaderboard(now.getMonth() + 1, now.getFullYear());
  const orphanClientsQuery = useGetOrphanClients();

  if (leaderboardQuery.isPending || orphanClientsQuery.isPending) {
    return <LoadingSkeleton rows={5} columns={4} />;
  }

  if (leaderboardQuery.errorMessage || !leaderboardQuery.data) {
    return (
      <EmptyState
        icon={Trophy}
        title="Branch overview unavailable"
        description={leaderboardQuery.errorMessage ?? 'Leaderboard data could not be loaded.'}
      />
    );
  }

  if (orphanClientsQuery.errorMessage || !orphanClientsQuery.data) {
    return (
      <EmptyState
        icon={Users}
        title="Orphan pool unavailable"
        description={orphanClientsQuery.errorMessage ?? 'Orphan pool data could not be loaded.'}
      />
    );
  }

  const leaderboardRows = leaderboardQuery.data.rows.slice(0, 5);
  const orphanCount = orphanClientsQuery.data.meta.total;

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
              Branch Manager
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Branch overview and orphan control
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Review the top producers, monitor the orphan queue, and move quickly into reassignment work.
            </p>
          </div>
          <Link
            href="/dashboard/cosaf/reassign"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft"
          >
            Open reassignment board <ArrowRightLeft className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          {
            step: 'Step 1',
            title: 'Check orphan count',
            description: 'Look at the orphan pool first so you know whether reassignment work needs immediate attention.',
            href: '/dashboard/cosaf/reassign',
            cta: 'Review orphan queue',
          },
          {
            step: 'Step 2',
            title: 'Reassign blocked clients',
            description: 'Move detached clients to active agents before they get stuck in downstream COSAF steps.',
            href: '/dashboard/cosaf/reassign',
            cta: 'Open reassignment board',
          },
          {
            step: 'Step 3',
            title: 'Review approvals and branch pulse',
            description: 'After reassignment, check approvals and leaderboard progress for the branch.',
            href: '/dashboard/cosaf',
            cta: 'Open COSAF approvals',
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

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-brand-gradient-soft p-3">
                <Trophy className="h-5 w-5 text-brand" />
              </div>
              <div>
                <CardTitle className="text-xl">Top 5 agents by APE</CardTitle>
                <CardDescription>Current branch leaderboard for the active reporting window.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {leaderboardRows.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="No leaderboard entries yet"
                description="Once production records land, the branch leaderboard will populate here."
              />
            ) : (
              leaderboardRows.map((row, index) => (
                <div
                  key={row.agentId}
                  className="flex items-center justify-between gap-4 rounded-[24px] border border-white/40 bg-background/70 p-4 dark:border-white/10"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand/75">
                      Rank #{index + 1}
                    </p>
                    <p className="mt-2 font-semibold text-foreground">{row.agentName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Persistency {formatPercent(Math.max(0, (1 - row.lapsationRate) * 100))}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{formatCurrency(row.api)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="border-destructive/25 bg-destructive/5 dark:bg-destructive/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-destructive/15 p-3 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">Orphan Pool Alert</CardTitle>
                  <CardDescription>Clients currently detached from an active agent.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight text-foreground">{orphanCount}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Client records are waiting in the orphan pool for Branch Manager review and reassignment.
              </p>
              <Link
                href="/dashboard/cosaf/reassign"
                className="mt-5 inline-flex items-center text-sm font-semibold text-destructive"
              >
                Review orphan clients <ArrowRightLeft className="ml-2 h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Branch Actions</CardTitle>
              <CardDescription>Use this sequence to keep the branch moving every day.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Link href="/dashboard/cosaf" className="rounded-[24px] border border-white/40 bg-background/75 p-4 dark:border-white/10">
                <p className="font-semibold text-foreground">COSAF approvals</p>
                <p className="mt-2 text-sm text-muted-foreground">Review submissions waiting for BM action.</p>
              </Link>
              <Link href="/dashboard/documents" className="rounded-[24px] border border-white/40 bg-background/75 p-4 dark:border-white/10">
                <p className="font-semibold text-foreground">Document repository</p>
                <p className="mt-2 text-sm text-muted-foreground">Open templates, upload references, and pin branch files.</p>
              </Link>
              <div className="rounded-[24px] border border-white/40 bg-brand-gradient-soft p-4 dark:border-white/10">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-brand" />
                  <div>
                    <p className="font-semibold text-foreground">Suggested daily order</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      1. Review orphan pool. 2. Reassign blocked clients. 3. Approve COSAF queue. 4. Check branch leaderboard.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
