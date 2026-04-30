import { DashboardModuleLoading } from '@/components/ui/dashboard-module-loading';

export default function CosafReassignLoading() {
  return (
    <DashboardModuleLoading
      eyebrow="Reassignment"
      titleWidthClassName="w-96"
      columns={2}
      rows={5}
    />
  );
}
