import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const REFRESH_TOKEN_COOKIE = 'refresh_token';

export function middleware(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const { pathname } = request.nextUrl;
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isResetPasswordRoute = pathname === '/auth/reset-password';

  if ((isDashboardRoute || isResetPasswordRoute) && !refreshToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/reset-password'],
};
