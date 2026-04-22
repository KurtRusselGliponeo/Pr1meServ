import { Card, CardContent, CardHeader } from '@/components/ui/card';

function PulseBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-muted/70 ${className}`} />;
}

export function ReassignmentBoardSkeleton() {
  return (
    <div className="space-y-6" aria-live="polite" aria-busy="true" aria-label="Loading reassignment board">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <PulseBlock className="h-3 w-40" />
        <PulseBlock className="mt-4 h-10 w-80 max-w-full" />
        <PulseBlock className="mt-4 h-4 w-full max-w-3xl" />
        <PulseBlock className="mt-2 h-4 w-full max-w-2xl" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-white/50 bg-white/72 dark:border-white/10 dark:bg-card/82">
          <CardHeader className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <PulseBlock className="h-6 w-56" />
                <PulseBlock className="h-4 w-full max-w-xl" />
              </div>
              <PulseBlock className="h-10 w-28" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
              <div className="space-y-4 rounded-[28px] border border-white/50 bg-background/70 p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.03]">
                <div className="space-y-2">
                  <PulseBlock className="h-5 w-32" />
                  <PulseBlock className="h-4 w-full max-w-xs" />
                </div>
                <div className="h-11 animate-pulse rounded-full bg-muted/70" />
                <div className="grid gap-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`agent-skeleton-${index}`}
                      className="rounded-[26px] border border-white/50 bg-background/85 p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <PulseBlock className="h-5 w-40" />
                      <PulseBlock className="mt-2 h-3 w-20" />
                      <PulseBlock className="mt-4 h-4 w-full" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 rounded-[28px] border border-white/50 bg-background/70 p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <PulseBlock className="h-5 w-32" />
                    <PulseBlock className="h-4 w-full max-w-sm" />
                  </div>
                  <PulseBlock className="h-10 w-28" />
                </div>
                <div className="h-11 animate-pulse rounded-full bg-muted/70" />
                <div className="rounded-[24px] border border-white/50 bg-brand-gradient-soft px-4 py-4 shadow-soft dark:border-white/10">
                  <PulseBlock className="h-5 w-32" />
                  <PulseBlock className="mt-3 h-4 w-full max-w-md" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`client-skeleton-${index}`}
                      className="rounded-[28px] border border-white/50 bg-background/88 p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <PulseBlock className="h-5 w-36" />
                      <PulseBlock className="mt-2 h-3 w-28" />
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <PulseBlock className="h-12 w-full rounded-2xl" />
                        <PulseBlock className="h-12 w-full rounded-2xl" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="rounded-[28px] border border-white/50 bg-background/70 p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.03]">
              <PulseBlock className="h-4 w-full max-w-lg" />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <PulseBlock className="h-4 w-full max-w-sm" />
              <PulseBlock className="h-12 w-48" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/50 bg-white/72 dark:border-white/10 dark:bg-card/82">
          <CardHeader className="space-y-3">
            <PulseBlock className="h-6 w-44" />
            <PulseBlock className="h-4 w-full max-w-xs" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`audit-skeleton-${index}`}
                className="rounded-[24px] border border-white/50 bg-background/70 p-4 dark:border-white/10"
              >
                <PulseBlock className="h-4 w-40" />
                <PulseBlock className="mt-3 h-4 w-full" />
                <PulseBlock className="mt-2 h-4 w-3/4" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function DocumentLibraryTableSkeleton() {
  return (
    <div className="space-y-6" aria-live="polite" aria-busy="true" aria-label="Loading document library">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-3">
          <PulseBlock className="h-9 w-60" />
          <PulseBlock className="h-4 w-96 max-w-full" />
        </div>
        <PulseBlock className="h-10 w-36" />
      </div>

      <div className="rounded-md border">
        <div className="flex flex-col gap-4 border-b border-border/70 bg-background/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-11 w-full max-w-sm animate-pulse rounded-full bg-muted/70" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <PulseBlock key={`filter-skeleton-${index}`} className="h-9 w-24" />
            ))}
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-[1.6fr_1fr_0.8fr_1fr_1fr] gap-4 border-b border-border/70 pb-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <PulseBlock key={`header-skeleton-${index}`} className="h-4 w-24" />
            ))}
          </div>
          <div className="space-y-4 py-4">
            {Array.from({ length: 6 }).map((_, rowIndex) => (
              <div
                key={`row-skeleton-${rowIndex}`}
                className="grid grid-cols-[1.6fr_1fr_0.8fr_1fr_1fr] items-center gap-4"
              >
                <PulseBlock className="h-5 w-4/5" />
                <PulseBlock className="h-8 w-24 rounded-full" />
                <PulseBlock className="h-4 w-16" />
                <PulseBlock className="h-4 w-24" />
                <div className="flex justify-end gap-2">
                  <PulseBlock className="h-9 w-10 rounded-xl" />
                  <PulseBlock className="h-9 w-28 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChartCardSkeleton({
  titleWidth = 'w-48',
  descriptionWidth = 'w-72',
  heightClassName = 'h-72',
}: {
  titleWidth?: string;
  descriptionWidth?: string;
  heightClassName?: string;
}) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <PulseBlock className={`h-6 ${titleWidth}`} />
        <PulseBlock className={`h-4 ${descriptionWidth}`} />
      </CardHeader>
      <CardContent>
        <div className={`${heightClassName} animate-pulse rounded-[28px] border border-white/50 bg-brand-gradient-soft dark:border-white/10`} />
      </CardContent>
    </Card>
  );
}
