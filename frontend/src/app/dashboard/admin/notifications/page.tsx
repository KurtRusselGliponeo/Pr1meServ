import { RoleGuard } from '@/features/identity';
import { NotificationLogsPageClient } from '@/features/admin/components/notification-logs-page-client';

export default function AdminNotificationsPage() {
  return (
    <RoleGuard allowedRoles={['Admin']}>
      <NotificationLogsPageClient />
    </RoleGuard>
  );
}
