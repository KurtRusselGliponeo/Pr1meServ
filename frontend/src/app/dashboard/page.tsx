export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-8 dark:bg-card/82">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand/75">Protected area</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Branch command center</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Monitor branch health, act on performance signals, and move between operational workspaces in a calmer, more readable command surface.
        </p>
      </section>
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Protected requests', '99.2%', 'Healthy session refresh and retry behavior'],
          ['Active modules', '5', 'Admin, COSAF, metrics, agent profiles, auth'],
          ['Shared patterns', '12', 'Reusable forms, guards, tables, dialogs, and charts'],
          ['System posture', 'Stable', 'Ready for deeper feature rollout and review'],
        ].map(([label, value, note]) => (
          <div key={label} className="floating-card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand/75">{label}</p>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{note}</p>
          </div>
        ))}
      </section>
      <div className="grid w-full gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="floating-card p-8">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Operational readiness</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            The dashboard shell now includes responsive navigation, guarded routes, shared loading and error handling, and global query and toast providers used by feature workspaces.
          </p>
        </section>
        <aside className="grid gap-6">
          <section className="floating-card p-6">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Session safety</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Protected requests attach the access token automatically, retry once after refresh, and send users back to sign-in if the session can no longer be recovered.
            </p>
          </section>
          <section className="floating-card p-6">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">UX baseline</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Loading skeletons, role-aware navigation, empty states, and destructive-action guards are available as shared primitives for the remaining modules.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
