import type { Metadata } from 'next';

import { RoleGuard } from '@/features/identity';
import { PersistencyPageClient } from '@/features/admin/components/persistency-page-client';

export const metadata: Metadata = {
  title: 'Manual Persistency',
  description: 'Monthly manual persistency management.',
};

export default function PersistencyPage() {
  return (
    <RoleGuard allowedRoles={['Admin']}>
      <PersistencyPageClient />
    </RoleGuard>
  );
}
