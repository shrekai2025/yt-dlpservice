import crypto from 'crypto'

export const ADMIN_AUTH_COOKIE = 'admin_auth'
export const ADMIN_AUTH_MAX_AGE = 60 * 60 * 12 // 12 hours

function getAdminCredentials(): { username: string; password: string } {
  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD

  if (!username || !password) {
    throw new Error('Admin credentials are not configured in the environment variables.')
  }

  return { username, password }
}

export function buildAdminAuthHash(username: string, password: string): string {
  return crypto.createHash('sha256').update(`${username}:${password}`).digest('hex')
}

export function getExpectedAdminAuthHash(): string {
  const { username, password } = getAdminCredentials()
  return buildAdminAuthHash(username, password)
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const { username: expectedUsername, password: expectedPassword } = getAdminCredentials()
  return username === expectedUsername && password === expectedPassword
}

export function isValidAdminAuthCookie(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false
  return cookieValue === getExpectedAdminAuthHash()
}
