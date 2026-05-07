import type { Metadata } from 'next';

import { RoleGuard } from '@/features/identity';
import { AdminDataCenterClient } from '@/features/admin/components/admin-data-center-client';

export const metadata: Metadata = {
  title: 'Admin Data Center',
  description: 'Unified admin workspace for manual PRU operations modules.',
};

export default function AdminDataCenterPage() {
  return (
    <RoleGuard allowedRoles={['Admin']}>
      <AdminDataCenterClient />
    </RoleGuard>
  );
}
