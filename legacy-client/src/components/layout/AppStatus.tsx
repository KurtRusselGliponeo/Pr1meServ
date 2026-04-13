type AppStatusProps = {
  apiReachable: boolean;
  supabaseConfigured: boolean;
};

export function AppStatus({ apiReachable, supabaseConfigured }: AppStatusProps) {
  const items = [
    {
      label: 'Frontend',
      value: 'Ready',
      tone: 'bg-[var(--accent-soft)] text-[var(--accent-strong)]',
    },
    {
      label: 'Backend',
      value: apiReachable ? 'Connected' : 'Waiting',
      tone: apiReachable
        ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
        : 'bg-[var(--danger-soft)] text-rose-700',
    },
    {
      label: 'Supabase',
      value: supabaseConfigured ? 'Configured' : 'Optional',
      tone: supabaseConfigured
        ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
        : 'bg-white text-[var(--text-soft)]',
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.label}
          className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]"
        >
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-soft)]">
            {item.label}
          </p>
          <p className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${item.tone}`}>
            {item.value}
          </p>
        </article>
      ))}
    </div>
  );
}
