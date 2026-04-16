import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      {({ sidebarTrigger }) => (
        <>
          <a
            href="#dashboard-content"
            className="sr-only z-50 rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Skip to main content
          </a>
          <DashboardHeader navigationTrigger={sidebarTrigger} />
          <main
            id="dashboard-content"
            className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          >
            {children}
          </main>
        </>
      )}
    </DashboardShell>
  );
}
