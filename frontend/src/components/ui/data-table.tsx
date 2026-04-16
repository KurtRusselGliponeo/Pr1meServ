'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DataTableProps<TData, TValue> {
  columns: Array<ColumnDef<TData, TValue>>;
  data: TData[];
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  className?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Filter results',
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return (
    <div className={cn('rounded-3xl border border-border/70 bg-card shadow-sm', className)}>
      <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Results</h2>
          <p className="text-sm text-muted-foreground">Sort, filter, and review records quickly.</p>
        </div>
        {onSearchChange ? (
          <label className="relative block w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="min-h-11 rounded-2xl pl-9"
              aria-label={searchPlaceholder}
            />
          </label>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border/70">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="-ml-3 h-auto min-h-11 rounded-2xl px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
                      </Button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60 last:border-b-0 hover:bg-muted/20">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-4 text-sm text-foreground">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface ServerPaginationControlsProps {
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
}

export function ServerPaginationControls({
  page,
  pageSize,
  total,
  hasNextPage,
  onPageChange,
}: ServerPaginationControlsProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{start}</span> to{' '}
        <span className="font-semibold text-foreground">{end}</span> of{' '}
        <span className="font-semibold text-foreground">{total}</span> results
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 rounded-2xl"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <span className="min-w-16 text-center text-sm font-medium text-foreground">Page {page}</span>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 rounded-2xl"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
