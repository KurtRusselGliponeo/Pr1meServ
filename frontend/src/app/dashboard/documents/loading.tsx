import { DashboardModuleLoading } from '@/components/ui/dashboard-module-loading';

export default function DocumentsLoading() {
  return (
    <DashboardModuleLoading
      eyebrow="Documents"
      titleWidthClassName="w-72"
      columns={4}
      rows={5}
    />
  );
}
