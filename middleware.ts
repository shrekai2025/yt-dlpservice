import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const ADMIN_COOKIE_NAME = "admin_auth"
let expectedHashPromise: Promise<string> | null = null

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

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next()
  }

  const authCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value ?? ""
  const expectedHash = await getExpectedHash()

  if (authCookie === expectedHash) {
    return NextResponse.next()
  }

  const loginUrl = new URL("/", request.url)
  loginUrl.searchParams.set("next", pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/admin/:path*"],
}
