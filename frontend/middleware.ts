import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { SystemRole } from '@a1prime/schemas';

const ACCESS_TOKEN_COOKIE = 'a1prime_access_token';

const protectedRouteRoles: Array<{
  matcher: RegExp;
  roles: SystemRole[];
}> = [
  {
    matcher: /^\/dashboard\/admin(\/.*)?$/,
    roles: ['Admin'],
  },
  {
    matcher: /^\/dashboard\/cosaf\/import(\/.*)?$/,
    roles: ['Admin', 'BranchManager'],
  },
  {
    matcher: /^\/dashboard\/cosaf\/reassign(\/.*)?$/,
    roles: ['Admin', 'BranchManager'],
  },
];

function decodeTokenRole(token: string): SystemRole | null {
  try {
    const payload = token.split('.')[1];

    if (!payload) {
      return null;
    }

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      '=',
    );
    const parsedPayload = JSON.parse(atob(paddedPayload)) as { role?: SystemRole; exp?: number };

    if (!parsedPayload.role) {
      return null;
    }

    if (parsedPayload.exp && parsedPayload.exp * 1000 <= Date.now()) {
      return null;
    }

    return parsedPayload.role;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/dashboard') && !accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/login' && accessToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (pathname.startsWith('/dashboard') && accessToken) {
    const role = decodeTokenRole(accessToken);

    if (!role) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const matchedProtectedRoute = protectedRouteRoles.find((route) => route.matcher.test(pathname));

    if (matchedProtectedRoute && !matchedProtectedRoute.roles.includes(role)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/unauthorized'],
};
