'use client';

import * as React from 'react';
import { BarChart3, ClipboardList, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import api from '@/services/api-client';
import { AdminPolicyRecordsClient } from '@/features/admin/components/admin-policy-records-client';
import { AdminNapTransactionsClient } from '@/features/admin/components/admin-nap-transactions-client';
import { AdminRecruitmentsClient } from '@/features/admin/components/admin-recruitments-client';
import { PersistencyPageClient } from '@/features/admin/components/persistency-page-client';
import { PlanCodesPageClient } from '@/features/admin/components/plan-codes-page-client';

type TabId =
  | 'overview'
  | 'policies'
  | 'nap-transactions'
  | 'recruitment'
  | 'persistency'
  | 'plan-codes'
  | 'policy-status'
  | 'validation-issues'
  | 'reports';

const DATA_CENTER_TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'policies', label: 'Policies' },
  { id: 'nap-transactions', label: 'NAP Transactions' },
  { id: 'recruitment', label: 'Recruitment' },
  { id: 'persistency', label: 'Persistency' },
  { id: 'plan-codes', label: 'Plan Codes' },
  { id: 'policy-status', label: 'Policy Status' },
  { id: 'validation-issues', label: 'Validation Issues' },
  { id: 'reports', label: 'Reports' },
];

type SummaryResponse = {
  generatedAtUtc: string;
  cards: {
    policiesIssued: number;
    totalNap: number;
    totalApeApi: number;
    activeValidationIssues: number;
    lapsedOrAtRiskPolicies: number;
    recruitmentCount: number;
  };
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);
}

function PlaceholderPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="p-8">
        <EmptyState icon={ClipboardList} title={title} description={description} />
      </CardContent>
    </Card>
  );
}

function OverviewPanel({ summary }: { summary: SummaryResponse['cards'] }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-5 w-5" />
            Operational snapshot
          </CardTitle>
          <CardDescription>Live summary across manual policy, NAP, recruitment, and data-quality workflows.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[
            ['Policies issued', String(summary.policiesIssued)],
            ['Total NAP', formatMoney(summary.totalNap)],
            ['Total APE/API', formatMoney(summary.totalApeApi)],
            ['Active validation issues', String(summary.activeValidationIssues)],
            ['Lapsed/at-risk policies', String(summary.lapsedOrAtRiskPolicies)],
            ['Recruitment count', String(summary.recruitmentCount)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-border p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldAlert className="h-5 w-5" />
            Workspace guidance
          </CardTitle>
          <CardDescription>Each module keeps its own search, filters, and operational controls inside the selected tab.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Use `Policies` and `NAP Transactions` for issued-business operations and production activity.</p>
          <p>Use `Recruitment`, `Persistency`, and `Plan Codes` for supporting performance and reference maintenance.</p>
          <p>`Policy Status`, `Validation Issues`, and `Reports` are reserved in the shell so we can centralize the remaining operational workflows without changing navigation again.</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminDataCenterClient() {
  const [activeTab, setActiveTab] = React.useState<TabId>('overview');
  const summaryQuery = useQuery({
    queryKey: ['admin-data-center-summary'],
    queryFn: async () => {
      const { data } = await api.get<SummaryResponse>('/admin/data-center/summary');
      return data;
    },
  });

  const cards = summaryQuery.data?.cards;

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">Admin Data Center</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Unified operational workspace</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">
          Centralize manual PRU operations modules in one dense admin workspace for issued policies, NAP activity, recruitment, persistency, reference maintenance, and upcoming validation/reporting flows.
        </p>
      </section>

      {summaryQuery.isPending ? (
        <LoadingSkeleton rows={2} columns={3} />
      ) : summaryQuery.isError || !cards ? (
        <EmptyState icon={FileSpreadsheet} title="Unable to load Data Center summary" description="Refresh the page or try again after checking the admin APIs." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {[
            ['Policies issued', String(cards.policiesIssued)],
            ['Total NAP', formatMoney(cards.totalNap)],
            ['Total APE/API', formatMoney(cards.totalApeApi)],
            ['Validation issues', String(cards.activeValidationIssues)],
            ['Lapsed / At Risk', String(cards.lapsedOrAtRiskPolicies)],
            ['Recruitment count', String(cards.recruitmentCount)],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Modules</CardTitle>
          <CardDescription>Choose a tab to work inside the Admin Data Center. Search and filters remain inside each module.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DATA_CENTER_TABS.map((tab) => (
              <Button
                key={tab.id}
                type="button"
                variant={activeTab === tab.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {activeTab === 'overview' ? <OverviewPanel summary={cards ?? {
        policiesIssued: 0,
        totalNap: 0,
        totalApeApi: 0,
        activeValidationIssues: 0,
        lapsedOrAtRiskPolicies: 0,
        recruitmentCount: 0,
      }} /> : null}
      {activeTab === 'policies' ? <AdminPolicyRecordsClient /> : null}
      {activeTab === 'nap-transactions' ? <AdminNapTransactionsClient /> : null}
      {activeTab === 'recruitment' ? <AdminRecruitmentsClient /> : null}
      {activeTab === 'persistency' ? <PersistencyPageClient /> : null}
      {activeTab === 'plan-codes' ? <PlanCodesPageClient /> : null}
      {activeTab === 'policy-status' ? (
        <PlaceholderPanel title="Policy Status workspace reserved" description="Policy lifecycle operations continue in the dedicated lapsation/status flow until this tab is fully consolidated." />
      ) : null}
      {activeTab === 'validation-issues' ? (
        <PlaceholderPanel title="Validation Issues workspace reserved" description="Validation issue triage is planned for this shell, but the dedicated operational surface is not exposed in this phase yet." />
      ) : null}
      {activeTab === 'reports' ? (
        <PlaceholderPanel title="Reports workspace reserved" description="Operational reporting shortcuts will be consolidated here without changing the Data Center navigation shell." />
      ) : null}
    </div>
  );
}
