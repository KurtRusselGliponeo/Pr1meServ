import type { Metadata } from 'next';

import { RoleGuard } from '@/features/identity';
import { PlanCodesPageClient } from '@/features/admin/components/plan-codes-page-client';

export const metadata: Metadata = {
  title: 'Plan Code Reference',
  description: 'Admin-managed plan code reference data.',
};

export default function PlanCodesPage() {
  return (
    <RoleGuard allowedRoles={['Admin']}>
      <PlanCodesPageClient />
    </RoleGuard>
  );
}
