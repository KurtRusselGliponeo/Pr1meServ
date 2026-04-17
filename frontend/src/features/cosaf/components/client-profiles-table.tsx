'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { FileSearch } from 'lucide-react';
import type { ClientProfile } from '@a1prime/schemas';

import { DataTable, ServerPaginationControls } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';

interface ClientProfilesTableProps {
  data: ClientProfile[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
}

export function ClientProfilesTable({
  data,
  page,
  pageSize,
  total,
  hasNextPage,
  searchValue,
  onSearchChange,
  onPageChange,
}: ClientProfilesTableProps) {
  const columns: Array<ColumnDef<ClientProfile>> = [
    {
      accessorKey: 'policyNumber',
      header: 'Policy',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">{row.original.policyNumber}</p>
          <p className="text-xs text-muted-foreground">{row.original.id}</p>
        </div>
      ),
    },
    {
      id: 'client',
      header: 'Client',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">
            {row.original.firstName} {row.original.lastName}
          </p>
          <p className="text-xs text-muted-foreground">
            Assigned agent: {row.original.assignedAgentId ?? 'Unassigned'}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'caseStatus',
      header: 'Case status',
    },
    {
      accessorKey: 'policyStatus',
      header: 'Policy status',
    },
    {
      accessorKey: 'modalPremium',
      header: 'Premium',
    },
  ];

  if (data.length === 0) {
    return (
      <EmptyState
        icon={FileSearch}
        title="No client profiles found for the current filter"
        description="Try a different search term or clear the active filters to broaden the server results."
      />
    );
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search by client name or policy number"
      />
      <ServerPaginationControls
        page={page}
        pageSize={pageSize}
        total={total}
        hasNextPage={hasNextPage}
        onPageChange={onPageChange}
      />
    </div>
  );
}
