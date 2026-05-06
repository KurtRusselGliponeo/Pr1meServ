import type { Metadata } from 'next';

import { RoleGuard } from '@/features/identity';
import { AdminNapTransactionsClient } from '@/features/admin/components/admin-nap-transactions-client';

export const metadata: Metadata = {
  title: 'NAP Transactions',
  description: 'Admin manual NAP transaction entry, review, and policy effect tracking.',
};

export default function AdminNapTransactionsPage() {
  return (
    <RoleGuard allowedRoles={['Admin']}>
      <AdminNapTransactionsClient />
    </RoleGuard>
  );
}
