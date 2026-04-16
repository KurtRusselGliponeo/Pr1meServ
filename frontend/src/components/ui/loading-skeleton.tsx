import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function LoadingSkeleton({ rows = 5, columns = 5, className }: LoadingSkeletonProps) {
  return (
    <div
      className={cn('floating-card overflow-hidden p-5 sm:p-6', className)}
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading content"
    >
      <div className="space-y-3">
        <div className="h-10 w-52 animate-pulse rounded-full bg-brand-gradient-soft" />
        <div className="overflow-hidden rounded-[28px] border border-white/50 bg-background/60 dark:border-white/10">
          <div
            className="grid gap-3 border-b border-white/50 bg-brand-gradient-soft p-4 dark:border-white/10"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, index) => (
              <div
                key={`head-${index}`}
                className="h-4 animate-pulse rounded-full bg-white/70 dark:bg-white/10"
              />
            ))}
          </div>
          <div className="space-y-3 p-4">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <div
                key={`row-${rowIndex}`}
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: columns }).map((__, columnIndex) => (
                  <div
                    key={`cell-${rowIndex}-${columnIndex}`}
                    className="h-11 animate-pulse rounded-2xl bg-muted/70"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
