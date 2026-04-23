import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

export default function DashboardLoading() {
  return (
    <main
      id="dashboard-content"
      className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
    >
      <div className="space-y-6 pb-8">
        <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
          <div className="space-y-3">
            <div className="h-3 w-32 animate-pulse rounded-full bg-muted/70" />
            <div className="h-10 w-96 max-w-full animate-pulse rounded-full bg-muted/70" />
            <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-muted/70" />
          </div>
        </section>
        <LoadingSkeleton className="w-full" rows={5} columns={4} />
      </div>
    </main>
  );
}
