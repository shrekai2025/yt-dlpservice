import { redirect } from 'next/navigation'

export default function TechDocRedirect(): never {
  redirect('/admin/api-doc')
}
