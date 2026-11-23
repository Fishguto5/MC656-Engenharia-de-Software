import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADMIN_COOKIE, getAuthorizedAdmin } from '@/lib/admin-session'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value
  if (!await getAuthorizedAdmin(cookie)) redirect('/admin/login')
  return children
}
