export default function AdminDashboard() {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-[var(--shadow)]">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-soft)]">Admin workspace</p>
        <h3 className="mt-4 text-4xl text-[var(--text)]">Operations dashboard starter</h3>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">
          The shell is ready for client inventory, reassignment queues, approval flows, and audit
          views once the business rules are locked in.
        </p>
      </article>

      <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)]">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-soft)]">Suggested first slices</p>
        <ul className="mt-4 space-y-3 pl-5 text-sm leading-7 text-[var(--text-soft)]">
          <li>Client list module with filters and pagination</li>
          <li>Reassignment request form and status timeline</li>
          <li>Admin-only action log and approval checkpoints</li>
        </ul>
      </article>
    </section>
  );
}
