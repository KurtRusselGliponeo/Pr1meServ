// Dashboard layout — wraps all authenticated pages with sidebar and topbar nav
// _components/ folder holds private components only used within this route
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      {/* <Sidebar /> — from ./_components/sidebar */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}
