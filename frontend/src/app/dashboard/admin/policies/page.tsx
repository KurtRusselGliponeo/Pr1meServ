import type { Metadata } from 'next';

import { RoleGuard } from '@/features/identity';
import { AdminPolicyRecordsClient } from '@/features/admin/components/admin-policy-records-client';

export const metadata: Metadata = {
  title: 'Policy Records',
  description: 'Admin per-policy record management for manual issued business.',
};

export default function AdminPolicyRecordsPage() {
  return (
    <RoleGuard allowedRoles={['Admin']}>
      <AdminPolicyRecordsClient />
    </RoleGuard>
  );
}
