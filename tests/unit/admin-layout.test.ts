import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAuthorizedAdmin } from '@/lib/admin-session'
import AdminLayout from '@/app/(admin)/layout'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/firebase', () => ({ firestore: {} }))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('redirect')
  }),
}))
vi.mock('@/lib/admin-session', () => ({
  ADMIN_COOKIE: 'admin_session',
  getAuthorizedAdmin: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('rotas de gerenciamento', () => {
  it('redireciona quem não possui sessão administrativa', async () => {
    vi.mocked(cookies).mockResolvedValue({ get: () => undefined } as never)
    vi.mocked(getAuthorizedAdmin).mockResolvedValue(null)

    await expect(AdminLayout({ children: 'conteúdo protegido' })).rejects.toThrow('redirect')
    expect(redirect).toHaveBeenCalledWith('/admin/login')
  })

  it('permite a renderização após verificar a sessão', async () => {
    vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: 'signed-cookie' }) } as never)
    vi.mocked(getAuthorizedAdmin).mockResolvedValue('52998224725')

    expect(await AdminLayout({ children: 'conteúdo protegido' })).toBe('conteúdo protegido')
    expect(getAuthorizedAdmin).toHaveBeenCalledWith('signed-cookie')
  })
})
