import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

interface DashboardModuleLoadingProps {
  eyebrow: string;
  titleWidthClassName?: string;
  columns?: number;
  rows?: number;
}

export function DashboardModuleLoading({
  eyebrow,
  titleWidthClassName = 'w-80',
  columns = 4,
  rows = 5,
}: DashboardModuleLoadingProps) {
  return (
    <div className="space-y-6 pb-8">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <div className="space-y-3">
          <div className="h-3 w-32 animate-pulse rounded-full bg-muted/70" />
          <div className={`h-10 max-w-full animate-pulse rounded-full bg-muted/70 ${titleWidthClassName}`} />
          <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-muted/70" />
          <div className="h-4 w-full max-w-xl animate-pulse rounded-full bg-muted/50" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
          {eyebrow}
        </p>
      </section>
      <LoadingSkeleton className="w-full" rows={rows} columns={columns} />
    </div>
  );
}
