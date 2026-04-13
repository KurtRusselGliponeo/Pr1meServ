export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.3),_transparent_30%),linear-gradient(135deg,_#5f0f16_0%,_#8f1622_45%,_#d62e3a_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.06)_35%,transparent_70%)]" />
      <div className="absolute -left-24 top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-72 w-72 translate-x-16 translate-y-16 rounded-full bg-amber-200/20 blur-3xl" />
      <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
        {children}
      </div>
    </div>
  );
}
