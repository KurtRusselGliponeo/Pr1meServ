import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

async function getAuthenticatedUser(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie');

  if (!cookieHeader) {
    return null;
  }

  const refreshResponse = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: {
      cookie: cookieHeader,
    },
  });

  if (!refreshResponse.ok) {
    return null;
  }

  const setCookieHeader = refreshResponse.headers.get('set-cookie');
  const { accessToken } = (await refreshResponse.json()) as { accessToken: string };

  const meResponse = await fetch(`${API_URL}/api/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!meResponse.ok) {
    return null;
  }

  const body = (await meResponse.json()) as { user: { needsPasswordReset: boolean } };

  return {
    user: body.user,
    setCookieHeader,
  };
}

export async function middleware(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const { pathname } = request.nextUrl;
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isResetPasswordRoute = pathname === '/auth/reset-password';

  if ((isDashboardRoute || isResetPasswordRoute) && !refreshToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (refreshToken) {
    const authState = await getAuthenticatedUser(request);

    if (!authState) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(REFRESH_TOKEN_COOKIE);
      return response;
    }

    const response = NextResponse.next();

    if (authState.setCookieHeader) {
      response.headers.set('set-cookie', authState.setCookieHeader);
    }

    if (authState.user.needsPasswordReset && isDashboardRoute) {
      const redirectResponse = NextResponse.redirect(new URL('/auth/reset-password', request.url));
      if (authState.setCookieHeader) {
        redirectResponse.headers.set('set-cookie', authState.setCookieHeader);
      }
      return redirectResponse;
    }

    if (!authState.user.needsPasswordReset && isResetPasswordRoute) {
      const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url));
      if (authState.setCookieHeader) {
        redirectResponse.headers.set('set-cookie', authState.setCookieHeader);
      }
      return redirectResponse;
    }

    if (pathname === '/login') {
      const redirectResponse = NextResponse.redirect(
        new URL(authState.user.needsPasswordReset ? '/auth/reset-password' : '/dashboard', request.url),
      );
      if (authState.setCookieHeader) {
        redirectResponse.headers.set('set-cookie', authState.setCookieHeader);
      }
      return redirectResponse;
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/unauthorized', '/auth/reset-password'],
};
