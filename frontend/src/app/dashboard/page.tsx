export default function DashboardPage() {
  return (
    <div className="grid w-full gap-6 md:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-3xl border border-border/70 bg-background/95 p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary/70">
          Protected area
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-foreground">Dashboard</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          This route is guarded by middleware and expects a valid stored access token before
          rendering protected dashboard pages.
        </p>
      </section>
      <aside className="rounded-3xl border border-border/70 bg-card p-8 shadow-sm">
        <h3 className="text-lg font-semibold">Auth status</h3>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Requests sent through the shared Axios client automatically attach the bearer token from
          the persisted frontend session.
        </p>
      </aside>
    </div>
  );
}
