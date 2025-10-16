import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const ADMIN_COOKIE_NAME = "admin_auth"
const PUBLIC_PATHS = new Set(["/"])
const PUBLIC_PATH_PREFIXES = ["/_next/static", "/_next/webpack-hmr", "/_next/image"]
const PUBLIC_FILE_EXCEPTIONS = ["/_next/data"]
const PUBLIC_API_PATHS = ["/api/login", "/api/logout"]

function hasFileExtension(pathname: string): boolean {
  return /\.[^/]+$/.test(pathname)
}

function isPublicFileRequest(pathname: string): boolean {
  if (!hasFileExtension(pathname)) {
    return false
  }

  return !PUBLIC_FILE_EXCEPTIONS.some((prefix) => pathname.startsWith(prefix))
}

function shouldBypassAuth(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) {
    return true
  }

  // 只放行登录/登出相关的 API
  if (PUBLIC_API_PATHS.some((path) => pathname.startsWith(path))) {
    return true
  }

  // 其他所有 API 都需要验证
  if (pathname.startsWith("/api")) {
    return false
  }

  if (PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true
  }

  if (pathname === "/favicon.ico" || pathname === "/robots.txt" || pathname === "/sitemap.xml") {
    return true
  }

  if (pathname.startsWith("/.well-known")) {
    return true
  }

  return isPublicFileRequest(pathname)
}

function shouldSetNextParam(pathname: string): boolean {
  if (pathname.startsWith("/_next/") || pathname.startsWith("/api")) {
    return false
  }

  return !hasFileExtension(pathname)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  console.log(`[Middleware] pathname: ${pathname}`)

  if (shouldBypassAuth(pathname)) {
    console.log(`[Middleware] bypassing auth for: ${pathname}`)
    return NextResponse.next()
  }

  // 简单检查 Cookie 是否存在且格式正确（Edge Runtime 限制，无法查询数据库）
  // Cookie 应该是 64 位十六进制字符串（SHA256 哈希）
  // 真正的验证在 tRPC context 和 Server Components 中进行
  const authCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value
  const HASH_REGEX = /^[a-f0-9]{64}$/i
  console.log(`[Middleware] authCookie: ${authCookie ? 'exists' : 'missing'}, valid: ${authCookie && HASH_REGEX.test(authCookie)}`)

  if (authCookie && HASH_REGEX.test(authCookie)) {
    return NextResponse.next()
  }

  console.log(`[Middleware] REDIRECTING: ${pathname} -> /`)
  const loginUrl = new URL("/", request.url)

  if (shouldSetNextParam(pathname)) {
    const target = `${pathname}${request.nextUrl.search}`
    loginUrl.searchParams.set("next", target)
  }

  const response = NextResponse.redirect(loginUrl)
  console.log(`[Middleware] Redirect response created`)
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
