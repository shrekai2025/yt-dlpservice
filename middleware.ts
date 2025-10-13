import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const ADMIN_COOKIE_NAME = "admin_auth"
const PUBLIC_PATHS = new Set(["/"])
const PUBLIC_PATH_PREFIXES = ["/_next/static", "/_next/webpack-hmr", "/_next/image"]
const PUBLIC_FILE_EXCEPTIONS = ["/_next/data"]

let expectedHashPromise: Promise<string> | null = null

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

  if (pathname.startsWith("/api")) {
    return true
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

async function computeExpectedHash(): Promise<string> {
  const username = process.env.ADMIN_USERNAME ?? ""
  const password = process.env.ADMIN_PASSWORD ?? ""

  if (!username || !password) {
    throw new Error("Admin credentials must be configured for authentication middleware to work.")
  }

  const encoder = new TextEncoder()
  const data = encoder.encode(`${username}:${password}`)
  const digest = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(digest))
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function getExpectedHash(): Promise<string> {
  if (!expectedHashPromise) {
    expectedHashPromise = computeExpectedHash()
  }
  return expectedHashPromise
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (shouldBypassAuth(pathname)) {
    return NextResponse.next()
  }

  const authCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value ?? ""
  const expectedHash = await getExpectedHash()

  if (authCookie === expectedHash) {
    return NextResponse.next()
  }

  const loginUrl = new URL("/", request.url)

  if (shouldSetNextParam(pathname)) {
    const target = `${pathname}${request.nextUrl.search}`
    loginUrl.searchParams.set("next", target)
  }

  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
}
