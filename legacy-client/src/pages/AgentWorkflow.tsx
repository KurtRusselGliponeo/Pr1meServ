export default function AgentWorkflow() {
  return (
    <section className="grid gap-6 md:grid-cols-3">
      <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-[var(--shadow)] md:col-span-2">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-soft)]">Agent workspace</p>
        <h3 className="mt-4 text-4xl text-[var(--text)]">Task flow starter</h3>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">
          This page is ready for queue views, assigned-client detail panels, activity tracking,
          and reassignment acknowledgment flows.
        </p>
      </article>

      <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)]">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-soft)]">Ready next</p>
        <ul className="mt-4 space-y-3 pl-5 text-sm leading-7 text-[var(--text-soft)]">
          <li>Assigned clients list</li>
          <li>Notes and handoff history</li>
          <li>Task completion actions</li>
        </ul>
      </article>
    </section>
  );
}
