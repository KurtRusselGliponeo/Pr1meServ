import { NavLink } from 'react-router-dom';
import { appConfig } from '../../config/env';

const links = [
  { to: '/', label: 'Sign in' },
  { to: '/admin', label: 'Admin workspace' },
  { to: '/agent', label: 'Agent workspace' },
];

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[rgba(251,247,239,0.82)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-soft)]">
            Ready-to-code setup
          </p>
          <h2 className="text-2xl text-[var(--text)]">{appConfig.appName}</h2>
        </div>

        <nav className="flex flex-wrap gap-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                [
                  'rounded-full border px-4 py-2 text-sm transition',
                  isActive
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)] hover:border-[var(--accent)] hover:text-[var(--accent-strong)]',
                ].join(' ')
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
