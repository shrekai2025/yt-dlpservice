import { NextResponse } from "next/server"
import { ADMIN_AUTH_COOKIE } from "~/lib/auth/simple-admin-auth"

export async function POST() {
  const response = NextResponse.json(
    { success: true },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  )

  response.cookies.set({
    name: ADMIN_AUTH_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  })

  return response
}
