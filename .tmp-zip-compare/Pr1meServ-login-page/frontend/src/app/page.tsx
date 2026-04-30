// Root redirect — sends users to login if not authenticated
import { redirect } from 'next/navigation';

export default function RootPage() {
  // TODO: check session cookie and redirect to /dashboard if authenticated
  redirect('/login');
}
