import { CosafApprovalsPanel } from '@/features/phase-2-bm-workflow/components/cosaf-approvals-panel';
import { CosafPageClient } from '@/features/phase-2-bm-workflow/components/cosaf-page-client';
import { CosafUploadPanel } from '@/features/phase-2-bm-workflow/components/cosaf-upload-panel';

interface CosafPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CosafPage({ searchParams }: CosafPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 fade-in">
      <CosafUploadPanel />
      <CosafApprovalsPanel />
      <section>
        <CosafPageClient searchParams={resolvedSearchParams} />
      </section>
    </div>
  );
}
