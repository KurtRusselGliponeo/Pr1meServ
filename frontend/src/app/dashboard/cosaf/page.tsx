import { CosafWorkflowPageClient } from '@/features/phase-2-bm-workflow/components/cosaf-workflow-page-client';

interface CosafPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CosafPage({ searchParams }: CosafPageProps) {
  const resolvedSearchParams = await searchParams;

  return <CosafWorkflowPageClient searchParams={resolvedSearchParams} />;
}
