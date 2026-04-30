import { RoleGuard } from '@/features/identity';
import { AdminHome } from '@/features/role-dashboard/components/admin-home';

export default function AdminDashboardPage() {
  return (
    <RoleGuard allowedRoles={['Admin']}>
      <AdminHome />
    </RoleGuard>
  );
}
