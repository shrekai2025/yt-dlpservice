import { NextResponse } from "next/server"
import {
  ADMIN_AUTH_COOKIE,
  ADMIN_AUTH_MAX_AGE,
  buildAdminAuthHash,
  verifyUserCredentials,
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

  // 使用数据库验证用户凭证
  const isValid = await verifyUserCredentials(username, password)

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

  // 设置 Cookie（使用用户名哈希）
  // 注意：如果远程服务器使用 HTTP，需要在 .env 中设置 FORCE_SECURE_COOKIE=false
  const isSecure = process.env.FORCE_SECURE_COOKIE === 'false'
    ? false
    : process.env.NODE_ENV === "production"

  response.cookies.set({
    name: ADMIN_AUTH_COOKIE,
    value: buildAdminAuthHash(username),
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: ADMIN_AUTH_MAX_AGE,
  })

  return response
}
