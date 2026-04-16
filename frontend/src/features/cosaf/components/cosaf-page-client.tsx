'use client';

import * as React from 'react';
import { AlertCircle, Users } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useGetClientProfiles } from '@/features/cosaf/hooks/use-get-client-profiles';
import { ClientProfilesTable } from './client-profiles-table';

interface CosafPageClientProps {
  searchParams: Record<string, string | string[] | undefined>;
}

function getSearchParam(value: string | string[] | undefined, fallback = ''): string {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

export function CosafPageClient({ searchParams }: CosafPageClientProps) {
  const initialPage = Number.parseInt(getSearchParam(searchParams.page, '1'), 10);
  const initialStatus = getSearchParam(searchParams.status);

  const [page, setPage] = React.useState(Number.isNaN(initialPage) ? 1 : initialPage);
  const [searchValue, setSearchValue] = React.useState('');
  const [status] = React.useState(initialStatus);

  const { data, isPending, isPlaceholderData, errorMessage } = useGetClientProfiles(page, {
    status,
    search: searchValue,
  });

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
              COSAF
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Client profiles
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Review assigned client records, check current case status, and keep profile handling
              fast even while paging through larger datasets.
            </p>
          </div>
          <div className="rounded-full border border-white/50 bg-brand-gradient-soft px-4 py-3 text-sm text-muted-foreground shadow-soft dark:border-white/10">
            {isPlaceholderData
              ? 'Refreshing the next page in the background.'
              : 'Live data from the protected COSAF endpoint.'}
          </div>
        </div>
      </section>

      {isPending ? <LoadingSkeleton rows={6} columns={5} /> : null}

      {!isPending && errorMessage ? (
        <section
          className="rounded-3xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive shadow-soft"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5" aria-hidden="true" />
            <div>
              <p className="font-semibold">We couldn&apos;t load client profiles</p>
              <p className="mt-1 leading-6">{errorMessage}</p>
            </div>
          </div>
        </section>
      ) : null}

      {!isPending && !errorMessage && data?.data.length ? (
        <ClientProfilesTable
          data={data.data}
          page={data.meta.page}
          pageSize={data.meta.pageSize}
          total={data.meta.total}
          hasNextPage={data.meta.hasNextPage}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onPageChange={setPage}
        />
      ) : null}

      {!isPending && !errorMessage && !data?.data.length ? (
        <EmptyState
          icon={Users}
          title="No client profiles found for the current filter"
          description="There are no matching records right now. Try changing the active filter or return later after new assignments are synced."
        />
      ) : null}
    </div>
  );
}
