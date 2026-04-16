export default function DashboardPage() {
  return (
    <div className="grid w-full gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-3xl border border-border/70 bg-background/95 p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary/70">
          Protected area
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Branch command center
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          The dashboard shell now includes responsive navigation, guarded routes, shared loading and
          error handling, and the global query and toast providers used by the feature workspaces.
        </p>
      </section>
      <aside className="grid gap-6">
        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Session safety</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Protected requests attach the access token automatically, retry once after refresh, and
            send users back to sign-in if the session can no longer be recovered.
          </p>
        </section>
        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">UX baseline</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Loading skeletons, role-aware navigation, empty states, and destructive-action guards are
            available as shared primitives for the remaining modules.
          </p>
        </section>
      </aside>
    </div>
  );
}
