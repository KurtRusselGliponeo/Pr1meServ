import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const ACCESS_TOKEN_COOKIE = "a1prime_access_token"

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/dashboard") && !accessToken) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname === "/login" && accessToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
}
