import type { Metadata } from 'next';
import { AdminPolicyRecordsClient } from '@/features/admin/components/admin-policy-records-client';

export const metadata: Metadata = {
  title: 'Policy Records',
  description: 'Admin per-policy record management — view, add, and edit all client policies per agent.',
};

export default function AdminPolicyRecordsPage() {
  return <AdminPolicyRecordsClient />;
}
