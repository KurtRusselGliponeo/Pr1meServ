export default function DashboardPage() {
  const workspaceCards = [
    {
      label: 'Client Profiles',
      value: 'Operational',
      note: 'Reassignment, intake, and profile review are grouped into one calmer workspace.',
    },
    {
      label: 'Performance',
      value: 'Live Ready',
      note: 'Metrics cards and charts are styled for review once backend production data is present.',
    },
    {
      label: 'Admin Controls',
      value: 'Role Aware',
      note: 'Protected views now match the shell instead of falling back to raw utility layouts.',
    },
    {
      label: 'System State',
      value: 'Phase 7',
      note: 'Theme switching, dark mode, floating cards, and polished loading states are active.',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="floating-card relative overflow-hidden bg-white/74 p-8 dark:bg-card/82">
        <div className="absolute inset-y-0 right-0 hidden w-72 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.6),transparent_62%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_62%)] lg:block" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand/75">
              Protected area
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Branch command center
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              Track branch activity, move into operational workspaces, and review system readiness
              from a dashboard that finally feels designed instead of scaffolded.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[28px] border border-white/55 bg-background/90 p-5 shadow-soft dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand/75">
                Active brand
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">Dual themes</p>
              <p className="mt-2 text-sm text-muted-foreground">Madras and Burgundy</p>
            </div>
            <div className="rounded-[28px] border border-white/55 bg-background/90 p-5 shadow-soft dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand/75">
                Visual mode
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">Light / Dark</p>
              <p className="mt-2 text-sm text-muted-foreground">Switchable in the shell header</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {workspaceCards.map(({ label, value, note }) => (
          <div key={label} className="floating-card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand/75">
              {label}
            </p>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{note}</p>
          </div>
        ))}
      </section>

      <div className="grid w-full gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="floating-card p-8">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Operational readiness
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            The command surface now has a clearer hierarchy: a branded shell, cleaner page framing,
            solid action buttons, and feature workspaces that look consistent whether data is
            loading, empty, or live.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              'Role-guarded navigation',
              'Intentional loading states',
              'Consistent form surfaces',
            ].map((item) => (
              <div
                key={item}
                className="rounded-[26px] border border-white/50 bg-brand-gradient-soft px-4 py-4 text-sm font-medium text-foreground shadow-soft dark:border-white/10"
              >
                {item}
              </div>
            ))}
          </div>
        </section>
        <aside className="grid gap-6">
          <section className="floating-card p-6">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Session safety</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Requests attach the in-memory token automatically, retry once after refresh, and send
              users back to sign-in if recovery fails.
            </p>
          </section>
          <section className="floating-card p-6">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">UX baseline</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Rounded tables, intentional skeletons, chart containers, empty states, and
              destructive-action guards are now shared patterns instead of one-off styles.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
