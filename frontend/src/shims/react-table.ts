import * as React from 'react';

export interface ColumnDef<TData, TValue = unknown> {
  id?: string;
  accessorKey?: keyof TData | string;
  header?: React.ReactNode | ((context: any) => React.ReactNode);
  cell?: (context: { row: { id: string; original: TData }; getValue: () => TValue | undefined }) => React.ReactNode;
}
