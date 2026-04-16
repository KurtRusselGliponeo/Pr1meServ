import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function LoadingSkeleton({ rows = 5, columns = 5, className }: LoadingSkeletonProps) {
  return (
    <div
      className={cn('rounded-3xl border border-border/70 bg-card p-4 shadow-sm', className)}
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading content"
    >
      <div className="space-y-3">
        <div className="h-10 w-48 animate-pulse rounded-2xl bg-muted" />
        <div className="overflow-hidden rounded-2xl border border-border/70">
          <div
            className="grid gap-3 border-b border-border/70 bg-muted/50 p-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, index) => (
              <div
                key={`head-${index}`}
                className="h-4 animate-pulse rounded bg-muted-foreground/15"
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
                    className="h-10 animate-pulse rounded-xl bg-muted"
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
