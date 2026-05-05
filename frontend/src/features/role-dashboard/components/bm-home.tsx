'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRightLeft, FileClock, Filter, Trophy, UserX } from 'lucide-react';
import { Command } from 'cmdk';
import { Input } from '@/components/ui/input';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useGetAgents } from '@/features/phase-3-reassignment/hooks/use-get-agents';
import { useDelistAgent } from '../hooks/use-delist-agent';
import { useGetBranchManagerDashboard } from '../hooks/use-get-branch-manager-dashboard';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function BMHome() {
  const now = new Date();
  const [filters, setFilters] = React.useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    agentId: '',
    status: '',
    product: '',
    lapsationState: '',
  });
  const dashboardQuery = useGetBranchManagerDashboard({
    month: filters.month,
    year: filters.year,
    agentId: filters.agentId || undefined,
    status: filters.status || undefined,
    product: filters.product || undefined,
    lapsationState: filters.lapsationState || undefined,
  });
  const agentsQuery = useGetAgents('');
  const delistAgentMutation = useDelistAgent();
  const [agentCodeToDelist, setAgentCodeToDelist] = React.useState('');
  const [agentSearchQuery, setAgentSearchQuery] = React.useState('');
  const [isAgentSearchOpen, setIsAgentSearchOpen] = React.useState(false);

  if (dashboardQuery.isPending) {
    return <LoadingSkeleton rows={5} columns={4} />;
  }

  if (!dashboardQuery.data || dashboardQuery.errorMessage) {
    return (
      <EmptyState
        icon={Trophy}
        title="Branch overview unavailable"
        description={dashboardQuery.errorMessage ?? 'We could not load branch manager analytics.'}
      />
    );
  }

  const { branch, summary, topPerformers, bottomPerformers, filteredClients } = dashboardQuery.data;

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
          Branch Manager Workspace
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Branch {branch.branchCode} overview
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          This view rolls up branch-wide analytics across all agents in your branch, including orphan
          handling, COSAF approvals, lapsation pressure, and current performer spread.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {([
          ['Orphan client count', String(summary.orphanClientCount)],
          ['Pending COSAF approvals', String(summary.pendingCosafApprovals)],
          [
            'Warning / Urgent / Lapsed',
            `${summary.warningPolicies} / ${summary.urgentPolicies} / ${summary.lapsedPolicies}`,
          ],
          ['Active agents', String(summary.activeAgents)],
          ['Total API', formatCurrency(summary.totalApi)],
          ['Total APE', formatCurrency(summary.totalApe)],
        ] as const).map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-brand" />
            <div>
              <CardTitle className="text-xl">Report Filters</CardTitle>
              <CardDescription>
                Filter branch reports by month, agent, status, product, and lapsation state.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
            type="number"
            min={1}
            max={12}
            value={filters.month}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                month: Number(event.target.value) || now.getMonth() + 1,
              }))
            }
            aria-label="Month"
          />
          <select
            className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
            value={filters.agentId}
            onChange={(event) =>
              setFilters((current) => ({ ...current, agentId: event.target.value }))
            }
            aria-label="Agent"
          >
            <option value="">All agents</option>
            {agentsQuery.data?.data.map(
              (agent: NonNullable<typeof agentsQuery.data>['data'][number]) => (
                <option key={agent.id} value={agent.id}>
                  {agent.displayName}
                </option>
              ),
            )}
          </select>
          <select
            className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({ ...current, status: event.target.value }))
            }
            aria-label="Status"
          >
            <option value="">All statuses</option>
            {['Uncontacted', 'Contacted', 'Forms Submitted', 'BM Signed', 'Done', 'Returned'].map(
              (status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ),
            )}
          </select>
          <input
            className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
            placeholder="Product"
            value={filters.product}
            onChange={(event) =>
              setFilters((current) => ({ ...current, product: event.target.value }))
            }
            aria-label="Product"
          />
          <select
            className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
            value={filters.lapsationState}
            onChange={(event) =>
              setFilters((current) => ({ ...current, lapsationState: event.target.value }))
            }
            aria-label="Lapsation state"
          >
            <option value="">All lapsation states</option>
            {['Warning', 'Urgent', 'Lapsed'].map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <Link href="/dashboard/cosaf/reassign" className="block">
          <Card className="h-full transition-transform hover:-translate-y-0.5">
            <CardHeader>
              <ArrowRightLeft className="h-5 w-5 text-brand" />
              <CardTitle className="text-xl">Orphan reassignment board</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Reassign orphaned clients to a new agent and remove them from the delisted portfolio.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/cosaf" className="block">
          <Card className="h-full transition-transform hover:-translate-y-0.5">
            <CardHeader>
              <FileClock className="h-5 w-5 text-brand" />
              <CardTitle className="text-xl">Pending COSAF approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Review submission queues, return incomplete cases, and release signed copies.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Card className="h-full">
          <CardHeader>
            <UserX className="h-5 w-5 text-brand" />
            <CardTitle className="text-xl">Delist agent workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Delisting immediately moves that portfolio into orphan handling so you can reassign it
              and notify the next agent.
            </p>
            <div className="relative w-full">
              <Input
                className="min-h-11 w-full rounded-xl"
                placeholder="Search agent by name or code to delist..."
                value={agentSearchQuery}
                onChange={(e) => {
                  setAgentSearchQuery(e.target.value);
                  setIsAgentSearchOpen(true);
                  if (agentCodeToDelist) setAgentCodeToDelist('');
                }}
                onFocus={() => setIsAgentSearchOpen(true)}
              />
              {isAgentSearchOpen && agentsQuery.data?.data && (
                <div className="absolute z-10 top-[calc(100%+8px)] w-full rounded-2xl border bg-background shadow-lg">
                  <Command className="overflow-hidden rounded-2xl bg-transparent">
                    <Command.List className="max-h-60 overflow-y-auto p-2">
                      <Command.Empty className="p-3 text-sm text-muted-foreground">No agent found.</Command.Empty>
                      {agentsQuery.data.data
                        .filter((a: any) => a.displayName.toLowerCase().includes(agentSearchQuery.toLowerCase()) || a.agentCode.toLowerCase().includes(agentSearchQuery.toLowerCase()))
                        .map((agent: any) => (
                        <Command.Item
                          key={agent.id}
                          value={agent.agentCode}
                          onSelect={() => {
                            setAgentCodeToDelist(agent.agentCode);
                            setAgentSearchQuery(`${agent.displayName} (${agent.agentCode})`);
                            setIsAgentSearchOpen(false);
                          }}
                          className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-accent"
                        >
                          {agent.displayName} ({agent.agentCode})
                        </Command.Item>
                      ))}
                    </Command.List>
                  </Command>
                </div>
              )}
              {isAgentSearchOpen && (
                <div 
                  className="fixed inset-0 z-0" 
                  onClick={() => setIsAgentSearchOpen(false)} 
                />
              )}
            </div>
            <ConfirmActionDialog
              title="Delist Agent"
              description={`Are you sure you want to delist agent ${agentCodeToDelist}? This will instantly move all their clients to the Orphan pool.`}
              confirmLabel="Yes, delist agent"
              isPending={delistAgentMutation.isPending}
              onConfirm={() => delistAgentMutation.mutate(agentCodeToDelist.trim())}
              trigger={
                <Button
                  type="button"
                  className="min-h-11 w-full rounded-full"
                  disabled={!agentCodeToDelist.trim() || delistAgentMutation.isPending}
                >
                  Delist agent
                </Button>
              }
            />
            <Dialog 
              open={delistAgentMutation.isSuccess && !!delistAgentMutation.data} 
              onOpenChange={(open) => {
                if (!open) {
                  delistAgentMutation.reset();
                  setAgentCodeToDelist('');
                  setAgentSearchQuery('');
                }
              }}
            >
              <DialogContent className="rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-emerald-600">Successfully Delisted!</DialogTitle>
                  <DialogDescription className="leading-6 pt-2">
                    Agent <strong>{delistAgentMutation.data?.targetAgentCode}</strong> has been successfully delisted.
                    <br /><br />
                    <strong>{delistAgentMutation.data?.orphanedClientProfiles}</strong> client(s) were moved to the Orphan pool and are now awaiting reassignment.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      delistAgentMutation.reset();
                      setAgentCodeToDelist('');
                      setAgentSearchQuery('');
                    }}
                    className="min-h-11 rounded-2xl"
                  >
                    Close
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {delistAgentMutation.errorMessage ? (
              <p className="text-sm text-destructive">{delistAgentMutation.errorMessage}</p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Top performers</CardTitle>
            <CardDescription>
              Highest ranking agents in your branch for the selected month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topPerformers.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="No branch performance data"
                description="Leaderboard rows will appear once the selected month has imported performance records."
              />
            ) : (
              topPerformers.map((row: (typeof topPerformers)[number], index: number) => (
                <div
                  key={row.agentId}
                  className="rounded-[24px] border border-white/40 bg-background/75 p-4 dark:border-white/10"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-brand/75">
                    Rank #{index + 1}
                  </p>
                  <p className="mt-2 font-semibold text-foreground">{row.agentName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    API {formatCurrency(row.api)} | Recruitment {row.recruitmentCount} | Lapsation{' '}
                    {row.lapsationCount}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Bottom performers</CardTitle>
            <CardDescription>
              Lowest ranking branch rows, useful for intervention and coaching.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {bottomPerformers.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="No branch performance data"
                description="Bottom performer rows will appear once the selected month has imported performance records."
              />
            ) : (
              bottomPerformers.map((row: (typeof bottomPerformers)[number]) => (
                <div
                  key={row.agentId}
                  className="rounded-[24px] border border-white/40 bg-background/75 p-4 dark:border-white/10"
                >
                  <p className="font-semibold text-foreground">{row.agentName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    API {formatCurrency(row.api)} | Recruitment {row.recruitmentCount} | Lapsation{' '}
                    {row.lapsationCount}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Filtered branch clients</CardTitle>
          <CardDescription>
            This slice respects the active month, agent, status, product, and lapsation filters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredClients.length === 0 ? (
            <EmptyState
              icon={Filter}
              title="No clients match these filters"
              description="Adjust the report filters to inspect a different branch slice."
            />
          ) : (
              filteredClients.map((client: (typeof filteredClients)[number]) => (
                <div
                  key={client.id}
                  className="rounded-[24px] border border-white/40 bg-background/75 p-4 dark:border-white/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">{client.clientName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {client.policyNumber} | {client.status} |{' '}
                        {client.assignedAgentName ?? 'Orphan pool'}
                      </p>
                    </div>
                    <div className="text-right text-xs uppercase tracking-[0.18em] text-brand/75">
                      <p>{client.productType ?? 'No product'}</p>
                      <p className="mt-2">{client.lapsationState ?? 'No lapsation flag'}</p>
                    </div>
                  </div>
                </div>
              ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
