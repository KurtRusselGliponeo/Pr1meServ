import { DashboardModuleLoading } from '@/components/ui/dashboard-module-loading';

export default function ProspectsLoading() {
  return (
    <DashboardModuleLoading
      eyebrow="Prospects"
      titleWidthClassName="w-80"
      columns={5}
      rows={5}
    />
  );
}
