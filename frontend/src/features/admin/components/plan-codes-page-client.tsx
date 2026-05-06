'use client';

import * as React from 'react';
import { FilePlus2, Pencil, RotateCcw, Search, SlidersHorizontal, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { PlanCodeFormDialog } from '@/features/admin/components/plan-code-form-dialog';
import { usePlanCodes, useTogglePlanCodeStatus } from '@/features/admin/hooks/use-plan-codes';
import type { PlanCodeReference } from '@/features/admin/types/plan-code.types';

function PlanCodeStatusAction({ planCode }: { planCode: PlanCodeReference }) {
  const toggleMutation = useTogglePlanCodeStatus(planCode);
  const isDeactivate = planCode.isActive;

  return (
    <ConfirmActionDialog
      trigger={
        <Button type="button" variant="ghost" size="sm" aria-label={isDeactivate ? 'Deactivate' : 'Reactivate'}>
          {isDeactivate ? <XCircle className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
        </Button>
      }
      title={isDeactivate ? 'Deactivate plan code' : 'Reactivate plan code'}
      description={`${isDeactivate ? 'Deactivate' : 'Reactivate'} ${planCode.planCode}? This is audit logged.`}
      confirmLabel={isDeactivate ? 'Deactivate' : 'Reactivate'}
      onConfirm={async () => {
        await toggleMutation.mutateAsync();
      }}
      isPending={toggleMutation.isPending}
    />
  );
}

export function PlanCodesPageClient() {
  const [search, setSearch] = React.useState('');
  const [classification, setClassification] = React.useState('');
  const [includeInactive, setIncludeInactive] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingPlanCode, setEditingPlanCode] = React.useState<PlanCodeReference | null>(null);

  const planCodesQuery = usePlanCodes({ search, classification, includeInactive });
  const planCodes = planCodesQuery.data ?? [];

  function openCreateDialog() {
    setEditingPlanCode(null);
    setDialogOpen(true);
  }

  function openEditDialog(planCode: PlanCodeReference) {
    setEditingPlanCode(planCode);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
          Admin Data Center
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Plan Code Reference
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Maintain manual plan code reference data used by policy validation and reporting.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <SlidersHorizontal className="h-5 w-5" />
            Search and filters
          </CardTitle>
          <CardDescription>Search by code, name, or category.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search plan codes"
                className="pl-9"
              />
            </div>
            <select
              value={classification}
              onChange={(event) => setClassification(event.target.value)}
              className="min-h-10 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Filter by classification"
            >
              <option value="">All classifications</option>
              <option value="OLUL">OLUL</option>
              <option value="ANH">ANH</option>
              <option value="Other">Other</option>
            </select>
            <label className="flex min-h-10 items-center gap-2 rounded-md border border-input px-3 text-sm">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(event) => setIncludeInactive(event.target.checked)}
              />
              Include inactive
            </label>
            <Button type="button" onClick={openCreateDialog} className="gap-2">
              <FilePlus2 className="h-4 w-4" />
              Add plan code
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reference table</CardTitle>
          <CardDescription>{planCodes.length} plan codes match the current view.</CardDescription>
        </CardHeader>
        <CardContent>
          {planCodesQuery.isPending ? (
            <LoadingSkeleton rows={6} columns={5} />
          ) : planCodesQuery.isError ? (
            <EmptyState
              icon={XCircle}
              title="Unable to load plan codes"
              description="Refresh the page or try again after checking your connection."
            />
          ) : planCodes.length === 0 ? (
            <EmptyState
              icon={FilePlus2}
              title="No plan codes found"
              description="Add the first manual plan code reference or adjust the filters."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-[1fr_1.6fr_1fr_0.8fr_0.8fr_auto] gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
                <span>Code</span>
                <span>Name</span>
                <span>Category</span>
                <span>Class</span>
                <span>Status</span>
                <span />
              </div>
              {planCodes.map((planCode) => (
                <div
                  key={planCode.id}
                  className="grid grid-cols-[1fr_1.6fr_1fr_0.8fr_0.8fr_auto] items-center gap-3 border-b px-4 py-3 text-sm last:border-b-0"
                >
                  <span className="font-semibold text-foreground">{planCode.planCode}</span>
                  <div>
                    <p className="font-medium text-foreground">{planCode.planName}</p>
                    {planCode.notes && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{planCode.notes}</p>
                    )}
                  </div>
                  <span className="text-muted-foreground">{planCode.productCategory}</span>
                  <Badge variant="outline">{planCode.classification}</Badge>
                  <Badge variant={planCode.isActive ? 'default' : 'secondary'}>
                    {planCode.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(planCode)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <PlanCodeStatusAction planCode={planCode} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PlanCodeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        planCode={editingPlanCode}
      />
    </div>
  );
}
