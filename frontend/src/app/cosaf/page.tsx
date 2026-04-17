import { CosafPageClient } from '@/features/cosaf/components/cosaf-page-client';

interface CosafPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function CosafPage({ searchParams }: CosafPageProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <CosafPageClient searchParams={searchParams} />
    </div>
  );
}
