import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AppHeader } from '../components/layout/AppHeader';
import { AppStatus } from '../components/layout/AppStatus';
import { appConfig } from '../config/env';
import { getSystemHealth, getSystemMeta } from '../features/system/api/system';

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [apiReachable, setApiReachable] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);

  useEffect(() => {
    let active = true;

    const loadStatus = async () => {
      try {
        await getSystemHealth();
        const meta = await getSystemMeta();

        if (!active) {
          return;
        }

        setApiReachable(true);
        setSupabaseConfigured(meta.supabaseConfigured);
      } catch {
        if (active) {
          setApiReachable(false);
          setSupabaseConfigured(false);
        }
      }
    };

    void loadStatus();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-6xl flex-col gap-8 px-6 py-8">
        <section className="grid gap-8 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)] lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <p className="text-sm uppercase tracking-[0.3em] text-[var(--accent-strong)]">
              Monorepo starter
            </p>
            <h1>{appConfig.appName}</h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--text-soft)]">
              Frontend and backend scaffolding are in place so the team can move straight into
              screens, workflows, auth, and reassignment rules after the ERD is finalized.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-strong)] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-soft)]">
              Environment notes
            </p>
            <ul className="mt-4 space-y-3 pl-5 text-sm leading-6 text-[var(--text-soft)]">
              <li>Client reads `VITE_API_URL` and defaults to `/api/v1`.</li>
              <li>Vite proxies `/api` requests to `http://localhost:3000` during local dev.</li>
              <li>Backend keeps Supabase optional until the data model is finalized.</li>
            </ul>
          </div>
        </section>

        <AppStatus apiReachable={apiReachable} supabaseConfigured={supabaseConfigured} />

        <section>{children}</section>
      </main>
    </div>
  );
}
