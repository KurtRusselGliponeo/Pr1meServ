// Login page — Client Component so form state can be handled
'use client';

export default function LoginPage() {
  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
      <h1 className="text-2xl font-bold text-pru-red mb-2">A1 Prime</h1>
      <p className="text-sm text-muted-foreground mb-6">PRU Life UK Branch Management System</p>
      {/* LoginForm component will be added from @/features/identity/components/login-form */}
      <p className="text-center text-muted-foreground text-sm">Login form coming soon.</p>
    </div>
  );
}
