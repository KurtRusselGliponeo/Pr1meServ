'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, CheckCircle2, Clock3, FileCheck2, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import type { CosafApprovalItem } from '../types/cosaf-approval.types';
import { useGetCosafApprovals } from '../hooks/use-get-cosaf-approvals';
import {
  useApproveCosafApproval,
  useRejectCosafApproval,
  useUploadSignedCosafCopy,
} from '../hooks/use-update-cosaf-approval';
import { CosafRejectionDialog } from './cosaf-rejection-dialog';

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function CosafApprovalsPanel() {
  const approvalsQuery = useGetCosafApprovals();
  const approveMutation = useApproveCosafApproval();
  const rejectMutation = useRejectCosafApproval();
  const signedCopyMutation = useUploadSignedCosafCopy();
  const [approvalToReject, setApprovalToReject] = React.useState<string | null>(null);
  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: 'createdAtUtc',
      desc: true,
    },
  ]);

  const columns = React.useMemo<Array<ColumnDef<CosafApprovalItem>>>(
    () => [
      {
        accessorKey: 'policyNumber',
        header: 'Policy',
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{row.original.policyNumber}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-brand/75">{row.original.status}</p>
          </div>
        ),
      },
      {
        accessorKey: 'assignedAgentName',
        header: 'Assigned agent',
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium text-foreground">{row.original.assignedAgentName}</p>
            <p className="text-sm text-muted-foreground">{row.original.clientProfileId}</p>
          </div>
        ),
      },
      {
        accessorKey: 'createdAtUtc',
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-3 h-auto px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"
            onClick={() => column?.toggleSorting?.(column.getIsSorted?.() === 'asc')}
          >
            Submission date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium text-foreground">{formatCreatedAt(row.original.createdAtUtc)}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              review pending
            </p>
          </div>
        ),
        sortingFn: 'datetime',
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => approveMutation.mutate({ approvalId: row.original.id })}
              disabled={approveMutation.isPending || rejectMutation.isPending || signedCopyMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4" />
              Accept
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="bg-destructive/90 text-destructive-foreground hover:bg-destructive"
              onClick={() => setApprovalToReject(row.original.id)}
              disabled={approveMutation.isPending || rejectMutation.isPending || signedCopyMutation.isPending}
            >
              <XCircle className="h-4 w-4" />
              Return
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium">
              Upload signed copy
              <input
                type="file"
                accept="application/pdf,.pdf,image/jpeg,image/png"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }

                  signedCopyMutation.mutate({
                    approvalId: row.original.id,
                    file,
                  });
                }}
              />
            </label>
          </div>
        ),
      },
    ],
    [approveMutation, rejectMutation],
  );

  const table = useReactTable({
    data: approvalsQuery.data?.data ?? [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleReject = React.useCallback(
    async (approvalId: string, reason: string) => {
      try {
        await rejectMutation.mutateAsync({ approvalId, reason });
        toast.success('COSAF submission rejected and returned to the agent.');
        setApprovalToReject(null);
      } catch {
        // Axios interceptor already surfaces the failure state.
      }
    },
    [rejectMutation],
  );

  React.useEffect(() => {
    if (approveMutation.isSuccess) {
      toast.success('COSAF accepted and the client moved into the next workflow step.');
      approveMutation.reset();
    }
  }, [approveMutation]);

  React.useEffect(() => {
    if (signedCopyMutation.isSuccess) {
      toast.success('Signed copy uploaded and the client moved to BM Signed.');
      signedCopyMutation.reset();
    }
  }, [signedCopyMutation]);

  if (approvalsQuery.isPending) {
    return <LoadingSkeleton rows={2} columns={2} />;
  }

  if (!approvalsQuery.data || approvalsQuery.errorMessage) {
    return (
      <EmptyState
        icon={FileCheck2}
        title="Approvals unavailable"
        description={approvalsQuery.errorMessage ?? 'Pending COSAF approvals are not available yet.'}
      />
    );
  }

  return (
    <Card className="overflow-hidden border border-brand/20 bg-white/72 dark:bg-card/82">
      <CardHeader className="bg-brand-gradient-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardDescription>Branch manager review queue</CardDescription>
            <CardTitle className="mt-2">Live COSAF approvals</CardTitle>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-brand shadow-soft dark:border-white/10 dark:bg-white/10">
            <Clock3 className="h-3.5 w-3.5" />
            {approvalsQuery.data.data.length} pending
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {approvalsQuery.data.data.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Approval queue is clear"
            description="There are no pending COSAF records waiting on manager review right now."
          />
        ) : (
          <div className="rounded-[28px] border border-white/50 bg-background/85 shadow-soft dark:border-white/10 dark:bg-white/[0.03]">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="border-white/50 bg-brand-gradient-soft dark:border-white/10"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="border-white/40 dark:border-white/10">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CosafRejectionDialog
        approvalId={approvalToReject}
        open={Boolean(approvalToReject)}
        isPending={rejectMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setApprovalToReject(null);
          }
        }}
        onSubmit={(approvalId, reason) => {
          void handleReject(approvalId, reason);
        }}
      />
    </Card>
  );
}
