export default function Login() {
  return (
    <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-[var(--shadow)]">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-soft)]">Auth starter</p>
        <h3 className="mt-4 text-4xl text-[var(--text)]">Sign-in screen scaffold</h3>
        <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-soft)]">
          This form is intentionally UI-only for now. You can wire Supabase Auth, JWT, RBAC,
          validation, and session handling later once the user roles and flows are final.
        </p>
        <div className="mt-8 grid gap-3 text-sm text-[var(--text-soft)] sm:grid-cols-3">
          <div className="rounded-2xl bg-[var(--accent-soft)] p-4">Role-based access</div>
          <div className="rounded-2xl bg-[var(--accent-soft)] p-4">Protected routes</div>
          <div className="rounded-2xl bg-[var(--accent-soft)] p-4">Session bootstrap</div>
        </div>
      </article>

      <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)]">
        <h3 className="text-2xl text-[var(--text)]">Sign in</h3>
        <p className="mt-2 text-sm text-[var(--text-soft)]">
          Ready for authentication wiring and API integration.
        </p>
        <form className="mt-8 space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
          />
          <button
            type="button"
            className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--accent-strong)]"
          >
            Sign In
          </button>
        </form>
      </article>
    </section>
  );
}
