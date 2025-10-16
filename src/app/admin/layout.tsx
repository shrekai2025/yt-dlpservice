import { AuthGuard } from '~/components/auth/auth-guard'
import AdminLayoutClient from './admin-layout-client'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </AuthGuard>
  )
}
