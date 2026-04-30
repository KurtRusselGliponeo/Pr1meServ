import * as React from 'react';

export type SortingState = Array<{
  id: string;
  desc: boolean;
}>;

export interface ColumnDef<TData, TValue = unknown> {
  id?: string;
  accessorKey?: keyof TData | string;
  header?:
    | React.ReactNode
    | ((context: {
        column?: {
          id: string;
          getIsSorted?: () => 'asc' | 'desc' | false;
          toggleSorting?: (desc?: boolean) => void;
        };
      }) => React.ReactNode);
  cell?: (context: {
    row: { id: string; original: TData };
    getValue: () => TValue | undefined;
  }) => React.ReactNode;
  sortingFn?: 'datetime' | 'text';
  enableSorting?: boolean;
}

type Header<TData> = {
  id: string;
  isPlaceholder: boolean;
  column: {
    id: string;
    columnDef: ColumnDef<TData, unknown>;
    getIsSorted: () => 'asc' | 'desc' | false;
    toggleSorting: (desc?: boolean) => void;
  };
  getContext: () => { column: { id: string; getIsSorted: () => 'asc' | 'desc' | false; toggleSorting: (desc?: boolean) => void } };
};

type Cell<TData> = {
  id: string;
  column: {
    id: string;
    columnDef: ColumnDef<TData, unknown>;
  };
  getContext: () => {
    row: { id: string; original: TData };
    getValue: () => unknown;
  };
};

type Row<TData> = {
  id: string;
  original: TData;
  getVisibleCells: () => Array<Cell<TData>>;
};

interface ReactTableOptions<TData> {
  data: TData[];
  columns: Array<ColumnDef<TData, unknown>>;
  state: {
    sorting: SortingState;
  };
  onSortingChange: (sorting: SortingState) => void;
  getCoreRowModel: () => unknown;
  getSortedRowModel: () => unknown;
}

function getColumnId<TData>(column: ColumnDef<TData, unknown>, index: number) {
  if (column.id) {
    return column.id;
  }

  if (typeof column.accessorKey === 'string') {
    return column.accessorKey;
  }

  return `column-${index}`;
}

function getCellValue<TData>(row: TData, column: ColumnDef<TData, unknown>) {
  if (typeof column.accessorKey === 'string') {
    return (row as Record<string, unknown>)[column.accessorKey];
  }

  return undefined;
}

function compareValues(left: unknown, right: unknown, sortingFn: ColumnDef<unknown, unknown>['sortingFn']) {
  if (sortingFn === 'datetime') {
    const leftTimestamp = new Date(String(left ?? '')).getTime();
    const rightTimestamp = new Date(String(right ?? '')).getTime();
    return leftTimestamp - rightTimestamp;
  }

  return String(left ?? '').localeCompare(String(right ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export function flexRender<TContext>(
  renderer: React.ReactNode | ((context: TContext) => React.ReactNode) | undefined,
  context: TContext,
) {
  if (typeof renderer === 'function') {
    return renderer(context);
  }

  return renderer ?? null;
}

export function getCoreRowModel() {
  return () => null;
}

export function getSortedRowModel() {
  return () => null;
}

export function useReactTable<TData>({
  data,
  columns,
  state,
  onSortingChange,
}: ReactTableOptions<TData>) {
  const headers = React.useMemo<Array<Header<TData>>>(() => {
    return columns.map((column, index) => {
      const id = getColumnId(column, index);

      return {
        id,
        isPlaceholder: false,
        column: {
          id,
          columnDef: column,
          getIsSorted: () => {
            const currentSort = state.sorting.find((item) => item.id === id);
            if (!currentSort) {
              return false;
            }

            return currentSort.desc ? 'desc' : 'asc';
          },
          toggleSorting: (desc) => {
            const isDesc = typeof desc === 'boolean' ? desc : false;
            onSortingChange([{ id, desc: isDesc }]);
          },
        },
        getContext: () => ({
          column: {
            id,
            getIsSorted: () => {
              const currentSort = state.sorting.find((item) => item.id === id);
              if (!currentSort) {
                return false;
              }

              return currentSort.desc ? 'desc' : 'asc';
            },
            toggleSorting: (desc) => {
              const isDesc = typeof desc === 'boolean' ? desc : false;
              onSortingChange([{ id, desc: isDesc }]);
            },
          },
        }),
      };
    });
  }, [columns, onSortingChange, state.sorting]);

  const sortedRows = React.useMemo<Array<Row<TData>>>(() => {
    const [sort] = state.sorting;
    const sortedData = [...data];

    if (sort) {
      const sortedColumnIndex = columns.findIndex((column, index) => getColumnId(column, index) === sort.id);

      if (sortedColumnIndex >= 0) {
        const sortedColumn = columns[sortedColumnIndex];
        sortedData.sort((left, right) => {
          const result = compareValues(
            getCellValue(left, sortedColumn),
            getCellValue(right, sortedColumn),
            sortedColumn.sortingFn ?? 'text',
          );

          return sort.desc ? -result : result;
        });
      }
    }

    return sortedData.map((row, rowIndex) => ({
      id: String(rowIndex),
      original: row,
      getVisibleCells: () =>
        columns.map((column, columnIndex) => {
          const columnId = getColumnId(column, columnIndex);

          return {
            id: `${rowIndex}-${columnId}`,
            column: {
              id: columnId,
              columnDef: column,
            },
            getContext: () => ({
              row: {
                id: String(rowIndex),
                original: row,
              },
              getValue: () => getCellValue(row, column),
            }),
          };
        }),
    }));
  }, [columns, data, state.sorting]);

  return {
    getHeaderGroups: () => [
      {
        id: 'header-group',
        headers,
      },
    ],
    getRowModel: () => ({
      rows: sortedRows,
    }),
  };
}
