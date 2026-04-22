import { DashboardShell } from '@/components/layouts/dashboard-shell';
import { DashboardPageTransition } from '@/components/ui/dashboard-page-transition';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      <a
        href="#dashboard-content"
        className="sr-only z-50 rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <DashboardPageTransition>{children}</DashboardPageTransition>
    </DashboardShell>
  );
}

