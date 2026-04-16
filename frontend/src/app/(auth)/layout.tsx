export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background bg-pastel-mesh">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.35)_30%,transparent_70%)] dark:bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.05)_30%,transparent_70%)]" />
      <div className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-hero-orb-1/30 blur-3xl" />
      <div className="absolute right-[-4rem] top-24 h-80 w-80 rounded-full bg-hero-orb-2/25 blur-3xl" />
      <div className="absolute bottom-[-3rem] left-1/3 h-72 w-72 rounded-full bg-hero-orb-3/25 blur-3xl" />
      <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
        {children}
      </div>
    </div>
  );
}
