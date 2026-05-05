'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, FileSpreadsheet, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useAuth } from '@/features/identity/context/auth-context';
import api from '@/services/api-client';

interface PolicyInventoryRecord {
  id: string;
  agentId: string | null;
  agentName: string;
  agentCode: string;
  clientName: string;
  policyNumber: string;
  productType: string | null;
  planCode: string | null;
  modalPremium: string;
  api: string;
  sumAssured: string;
  commissionAmount: string;
  caseStatus: string;
  policyStatus: string;
  dateIssued: string | null;
  dateClosed: string | null;
  branchCode: string;
  updatedAt: string;
}

interface PoliciesResponse {
  data: PolicyInventoryRecord[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

const PAGE_SIZE = 15;

function formatCurrency(value: string) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const pages = new Set([1, totalPages]);

  for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
    if (page >= 1 && page <= totalPages) {
      pages.add(page);
    }
  }

  return [...pages].sort((left, right) => left - right);
}

export function PolicyInventoryPageClient() {
  const { user } = useAuth();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const deferredSearch = React.useDeferredValue(search.trim());

  React.useEffect(() => {
    setPage(1);
  }, [deferredSearch]);

  const policiesQuery = useQuery({
    queryKey: ['policy-inventory', page, deferredSearch],
    queryFn: async () => {
      const response = await api.get<PoliciesResponse>('/policies', {
        params: {
          page,
          pageSize: PAGE_SIZE,
          search: deferredSearch || undefined,
        },
      });

      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const data = policiesQuery.data;
  const records = data?.data ?? [];
  const meta = data?.meta;
  const visiblePages = getVisiblePages(meta?.page ?? page, meta?.totalPages ?? 1);
  const firstRow = meta ? (meta.page - 1) * meta.pageSize + 1 : 0;
  const lastRow = meta ? Math.min(meta.page * meta.pageSize, meta.total) : 0;
  const scopeLabel =
    user?.role === 'Agent'
      ? 'Your assigned policies'
      : user?.role === 'BranchManager'
        ? 'Branch policies'
        : 'All policy records';

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
          Policy Inventory
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          {scopeLabel}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Review the full policy list in your allowed scope with spreadsheet-style columns,
          search, and 15 records per page.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Policies</CardTitle>
          <CardDescription>
            Search by client, policy number, product, or plan code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="Search policies"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {meta ? (
              <p className="text-sm text-muted-foreground">
                Showing {meta.total === 0 ? 0 : firstRow}-{lastRow} of {meta.total}
              </p>
            ) : null}
          </div>

          {policiesQuery.isPending ? (
            <LoadingSkeleton rows={8} columns={6} />
          ) : records.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              title="No policies found"
              description="No policy records match the current search in your allowed scope."
            />
          ) : (
            <div className="overflow-hidden rounded-md border border-border bg-background">
              <div className="overflow-x-auto">
                <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
                  <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                    <tr>
                      {[
                        'Client',
                        'Policy No.',
                        'Agent',
                        'Branch',
                        'Product',
                        'Plan',
                        'Modal Premium',
                        'API',
                        'Sum Assured',
                        'Case',
                        'Policy',
                        'Updated',
                      ].map((header) => (
                        <th key={header} className="border-b border-r border-border px-3 py-2 font-semibold last:border-r-0">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((policy) => (
                      <tr key={policy.id} className="odd:bg-background even:bg-muted/20 hover:bg-brand/5">
                        <td className="border-b border-r border-border px-3 py-2 font-medium text-foreground">
                          {policy.clientName}
                        </td>
                        <td className="border-b border-r border-border px-3 py-2 text-foreground">
                          {policy.policyNumber}
                        </td>
                        <td className="border-b border-r border-border px-3 py-2">
                          <p className="font-medium text-foreground">{policy.agentName}</p>
                          <p className="text-xs text-muted-foreground">{policy.agentCode}</p>
                        </td>
                        <td className="border-b border-r border-border px-3 py-2">{policy.branchCode}</td>
                        <td className="border-b border-r border-border px-3 py-2">
                          {policy.productType ?? '-'}
                        </td>
                        <td className="border-b border-r border-border px-3 py-2">
                          {policy.planCode ?? '-'}
                        </td>
                        <td className="border-b border-r border-border px-3 py-2 tabular-nums">
                          {formatCurrency(policy.modalPremium)}
                        </td>
                        <td className="border-b border-r border-border px-3 py-2 tabular-nums">
                          {formatCurrency(policy.api)}
                        </td>
                        <td className="border-b border-r border-border px-3 py-2 tabular-nums">
                          {formatCurrency(policy.sumAssured)}
                        </td>
                        <td className="border-b border-r border-border px-3 py-2">{policy.caseStatus}</td>
                        <td className="border-b border-r border-border px-3 py-2">{policy.policyStatus}</td>
                        <td className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                          {new Date(policy.updatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {meta && meta.totalPages > 1 ? (
                <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Page {meta.page} of {meta.totalPages}
                  </p>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!meta.hasPreviousPage}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    {visiblePages.map((visiblePage, index) => {
                      const previousPage = visiblePages[index - 1];
                      const showGap = previousPage && visiblePage - previousPage > 1;

                      return (
                        <React.Fragment key={visiblePage}>
                          {showGap ? (
                            <span className="px-2 text-sm text-muted-foreground">...</span>
                          ) : null}
                          <Button
                            type="button"
                            variant={visiblePage === meta.page ? 'default' : 'outline'}
                            size="sm"
                            className="min-w-9 px-3"
                            onClick={() => setPage(visiblePage)}
                          >
                            {visiblePage}
                          </Button>
                        </React.Fragment>
                      );
                    })}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!meta.hasNextPage}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
