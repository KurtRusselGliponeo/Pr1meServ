'use client';

import * as React from 'react';
import { ArrowUpDown, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';

function renderCellContent<TData, TValue>(
  column: ColumnDef<TData, TValue>,
  row: TData,
  rowIndex: number,
) {
  if (typeof column.cell === 'function') {
    return column.cell({
      row: {
        id: String(rowIndex),
        original: row,
      },
      getValue: () =>
        'accessorKey' in column && typeof column.accessorKey === 'string'
          ? ((row as Record<string, unknown>)[column.accessorKey] as TValue | undefined)
          : undefined,
    });
  }

  if ('accessorKey' in column && typeof column.accessorKey === 'string') {
    return String((row as Record<string, unknown>)[column.accessorKey] ?? '');
  }

  return null;
}

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
  const [sortingColumn, setSortingColumn] = React.useState<string | null>(null);
  const [sortingDirection, setSortingDirection] = React.useState<'asc' | 'desc'>('asc');

  const sortedData = React.useMemo(() => {
    if (!sortingColumn) {
      return data;
    }

    return [...data].sort((left, right) => {
      const leftValue = (left as Record<string, unknown>)[sortingColumn];
      const rightValue = (right as Record<string, unknown>)[sortingColumn];
      const normalizedLeft = String(leftValue ?? '');
      const normalizedRight = String(rightValue ?? '');
      const result = normalizedLeft.localeCompare(normalizedRight, undefined, { numeric: true });

      return sortingDirection === 'asc' ? result : -result;
    });
  }, [data, sortingColumn, sortingDirection]);

  function handleSort(column: ColumnDef<TData, TValue>) {
    if (!('accessorKey' in column) || typeof column.accessorKey !== 'string') {
      return;
    }

    if (sortingColumn === column.accessorKey) {
      setSortingDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortingColumn(column.accessorKey);
    setSortingDirection('asc');
  }

  return (
    <div className={cn('floating-card overflow-hidden', className)}>
      <div className="flex flex-col gap-3 border-b border-white/50 bg-brand-gradient-soft p-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
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
              className="min-h-12 rounded-full pl-10"
              aria-label={searchPlaceholder}
            />
          </label>
        ) : null}
      </div>
      <div className="overflow-x-auto px-3 pb-3">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-white/40 dark:border-white/10">
              {columns.map((column, columnIndex) => (
                <th
                  key={`header-${columnIndex}`}
                  className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground"
                >
                  {'accessorKey' in column && typeof column.accessorKey === 'string' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="-ml-3 h-auto min-h-11 rounded-full px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground"
                      onClick={() => handleSort(column)}
                    >
                      {typeof column.header === 'function'
                        ? column.header({
                            column: {
                              id: column.accessorKey,
                            },
                          })
                        : column.header}
                      <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Button>
                  ) : typeof column.header === 'function' ? (
                    column.header({})
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, rowIndex) => (
              <tr
                key={`row-${rowIndex}`}
                className="border-b border-white/35 transition-colors last:border-b-0 hover:bg-brand-gradient-soft dark:border-white/10"
              >
                {columns.map((column, columnIndex) => (
                  <td
                    key={`cell-${rowIndex}-${columnIndex}`}
                    className="px-4 py-4 text-sm text-foreground"
                  >
                    {renderCellContent(column, row, rowIndex)}
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
    <div className="floating-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{start}</span> to{' '}
        <span className="font-semibold text-foreground">{end}</span> of{' '}
        <span className="font-semibold text-foreground">{total}</span> results
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 rounded-full"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <span className="min-w-16 text-center text-sm font-medium text-foreground">
          Page {page}
        </span>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 rounded-full"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
