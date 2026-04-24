import { DashboardModuleLoading } from '@/components/ui/dashboard-module-loading';

export default function PerformanceLoading() {
  return (
    <DashboardModuleLoading
      eyebrow="Performance"
      titleWidthClassName="w-[30rem]"
      columns={4}
      rows={6}
    />
  );
}
