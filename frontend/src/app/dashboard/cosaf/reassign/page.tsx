import { RoleGuard } from '@/features/identity';
import { ReassignPageClient } from '@/features/cosaf/components/reassign-page-client';

export default function CosafReassignPage() {
  return (
    <RoleGuard allowedRoles={['Admin', 'BranchManager']}>
      <ReassignPageClient />
    </RoleGuard>
  );
}
