// (auth)/layout.tsx — Group layout for Login and Password Reset pages
// Does NOT inherit the dashboard sidebar or nav
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pru-red-dark via-pru-red to-pru-red-light">
      {children}
    </div>
  );
}
