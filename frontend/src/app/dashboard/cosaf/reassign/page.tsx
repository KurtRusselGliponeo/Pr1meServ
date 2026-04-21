import { RoleGuard } from '@/features/identity';
import { ReassignPageClient } from '@/features/phase-3-reassignment/components/reassign-page-client';

export default function CosafReassignPage() {
  return (
    <RoleGuard allowedRoles={['Admin']}>
      <ReassignPageClient />
    </RoleGuard>
  );
}
