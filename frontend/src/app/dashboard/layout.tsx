import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_rgba(127,29,29,0.06)_0%,_transparent_22%),linear-gradient(135deg,_#fff8f8_0%,_#ffffff_45%,_#fff4ea_100%)]">
      <header className="border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">A1 Prime</p>
            <h1 className="text-lg font-semibold text-foreground">Branch Dashboard</h1>
          </div>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/dashboard" className="transition-colors hover:text-foreground">
              Overview
            </Link>
            <Link href="/login" className="transition-colors hover:text-foreground">
              Login
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-6xl flex-1 overflow-y-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
