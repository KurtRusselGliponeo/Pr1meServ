import type { Metadata } from 'next';

import { RoleGuard } from '@/features/identity';
import { AdminRecruitmentsClient } from '@/features/admin/components/admin-recruitments-client';

export const metadata: Metadata = {
  title: 'Recruitments',
  description: 'Admin manual recruitment tracking and lifecycle management.',
};

export default function AdminRecruitmentsPage() {
  return (
    <RoleGuard allowedRoles={['Admin']}>
      <AdminRecruitmentsClient />
    </RoleGuard>
  );
}
