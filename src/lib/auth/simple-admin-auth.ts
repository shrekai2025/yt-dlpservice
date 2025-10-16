import crypto from 'crypto'
import { db } from '~/server/db'

export const ADMIN_AUTH_COOKIE = 'admin_auth'
export const ADMIN_AUTH_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

/**
 * 根据用户名生成认证哈希
 */
export function buildAdminAuthHash(username: string): string {
  return crypto.createHash('sha256').update(username).digest('hex')
}

/**
 * 验证用户凭证（从数据库查询）
 */
export async function verifyUserCredentials(
  username: string,
  password: string
): Promise<boolean> {
  try {
    const user = await db.user.findUnique({
      where: { username }
    })

    if (!user) {
      return false
    }

    // 明文密码比对
    return user.password === password
  } catch (error) {
    console.error('Failed to verify user credentials:', error)
    return false
  }
}

/**
 * 根据用户名获取用户
 */
export async function getUserByUsername(username: string) {
  try {
    return await db.user.findUnique({
      where: { username }
    })
  } catch (error) {
    console.error('Failed to get user by username:', error)
    return null
  }
}

/**
 * 验证 Cookie 是否有效（查询数据库所有用户验证）
 */
export async function isValidAdminAuthCookie(
  cookieValue: string | undefined
): Promise<boolean> {
  if (!cookieValue) return false

  try {
    // 获取所有用户的用户名
    const users = await db.user.findMany({
      select: { username: true }
    })

    // 检查 Cookie 哈希是否匹配任何用户
    return users.some((user) => buildAdminAuthHash(user.username) === cookieValue)
  } catch (error) {
    console.error('Failed to validate admin auth cookie:', error)
    return false
  }
}
