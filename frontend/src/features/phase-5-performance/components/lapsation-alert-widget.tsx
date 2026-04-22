'use client';

import { AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/identity/context/auth-context';
import { useGetLapsationDashboard } from '../hooks/use-get-lapsation-dashboard';

export function LapsationAlertWidget() {
  const { user, isHydrated } = useAuth();
  const dashboardQuery = useGetLapsationDashboard();

  if (!isHydrated || !user || user.role !== 'Agent') {
    return null;
  }

  if (!dashboardQuery.data || dashboardQuery.isPending || dashboardQuery.errorMessage) {
    return null;
  }

  const atRiskRecords = dashboardQuery.data.records.filter(
    (record) => record.isAtRisk && !record.reinstatedAtUtc,
  );

  if (atRiskRecords.length === 0) {
    return null;
  }

  return (
    <Link href="/dashboard/lapsation?filter=urgent" className="group block">
      <Card className="border border-destructive/30 bg-destructive/10 shadow-soft transition-all hover:-translate-y-0.5 hover:border-destructive/50 hover:shadow-lg dark:border-destructive/40 dark:bg-[linear-gradient(135deg,rgba(127,29,29,0.28),rgba(89,15,44,0.55))]">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-destructive/15 p-3 text-destructive dark:bg-destructive/20 dark:text-white">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <CardDescription className="text-destructive dark:text-red-100">
                  Immediate action required
                </CardDescription>
                <CardTitle className="mt-1 text-foreground dark:text-white">
                  At-risk policies need follow-up
                </CardTitle>
              </div>
            </div>
            <div className="flex items-center gap-2 text-destructive dark:text-red-100">
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">Open queue</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-6 text-destructive dark:text-red-50">
            {atRiskRecords.length} policy{atRiskRecords.length === 1 ? '' : 'ies'} are currently at
            risk. Reach out before these accounts move deeper into lapsation.
          </p>
          <div className="grid gap-3">
            {atRiskRecords.map((record) => (
              <div
                key={record.id}
                className="rounded-[24px] border border-destructive/20 bg-background/80 px-4 py-3 transition-colors group-hover:border-destructive/35 dark:border-white/10 dark:bg-black/20"
              >
                <p className="font-semibold text-foreground dark:text-white">{record.clientName}</p>
                <p className="mt-1 text-sm text-muted-foreground dark:text-red-100/85">
                  Policy {record.policyNumber} - {record.riskLevel} risk
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
