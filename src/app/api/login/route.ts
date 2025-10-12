import { NextResponse } from "next/server"
import {
  ADMIN_AUTH_COOKIE,
  ADMIN_AUTH_MAX_AGE,
  getExpectedAdminAuthHash,
  verifyAdminCredentials,
} from "~/lib/auth/simple-admin-auth"

type LoginRequestBody = {
  username?: string
  password?: string
}

export async function POST(request: Request) {
  let payload: LoginRequestBody

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { error: "请求体格式不正确" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    )
  }

  const username = payload.username?.trim() ?? ""
  const password = payload.password?.trim() ?? ""

  if (!username || !password) {
    return NextResponse.json(
      { error: "用户名或密码不能为空" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    )
  }

  const isValid = verifyAdminCredentials(username, password)

  if (!isValid) {
    return NextResponse.json(
      { error: "用户名或密码错误" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    )
  }

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
    value: getExpectedAdminAuthHash(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_AUTH_MAX_AGE,
  })

  return response
}
