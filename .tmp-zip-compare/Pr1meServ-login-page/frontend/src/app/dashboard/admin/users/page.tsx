import { RoleGuard } from '@/features/identity';
import { UsersPageClient } from '@/features/admin/components/users-page-client';

export default function AdminUsersPage() {
  return (
    <RoleGuard allowedRoles={['Admin']}>
      <UsersPageClient />
    </RoleGuard>
  );
}
