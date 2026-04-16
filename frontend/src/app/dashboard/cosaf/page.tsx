import { Suspense } from 'react';

import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { CosafPageClient } from '@/features/cosaf/components/cosaf-page-client';

interface CosafPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CosafPage({ searchParams }: CosafPageProps) {
  const resolvedSearchParams = await (searchParams ?? Promise.resolve({}));

  return (
    <Suspense fallback={<LoadingSkeleton rows={6} columns={5} />}>
      <CosafPageClient searchParams={resolvedSearchParams} />
    </Suspense>
  );
}
