import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isValidAdminAuthCookie } from '~/lib/auth/simple-admin-auth'

export async function AuthGuard({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('admin_auth')?.value

  const isValid = await isValidAdminAuthCookie(authCookie)

  if (!isValid) {
    redirect('/')
  }

  return <>{children}</>
}
