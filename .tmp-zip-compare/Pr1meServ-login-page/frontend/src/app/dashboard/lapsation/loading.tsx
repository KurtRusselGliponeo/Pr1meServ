import { DashboardModuleLoading } from '@/components/ui/dashboard-module-loading';

export default function LapsationLoading() {
  return (
    <DashboardModuleLoading
      eyebrow="Lapsation"
      titleWidthClassName="w-[28rem]"
      columns={5}
      rows={6}
    />
  );
}
