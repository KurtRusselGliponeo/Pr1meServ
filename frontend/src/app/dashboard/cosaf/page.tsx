import { CosafApprovalsPanel } from '@/features/cosaf/components/cosaf-approvals-panel';
import { CosafPageClient } from '@/features/cosaf/components/cosaf-page-client';

interface CosafPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CosafPage({ searchParams }: CosafPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 fade-in">
      <CosafApprovalsPanel />
      <section>
        <CosafPageClient searchParams={resolvedSearchParams} />
      </section>
    </div>
  );
}
