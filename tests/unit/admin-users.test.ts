import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDoc } from 'firebase/firestore'
import { NextRequest } from 'next/server'
import { createAdminSession } from '@/lib/admin-session'
import { registerAdmin } from '@/lib/admin-registration'
import { POST } from '@/app/api/admin/users/route'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/firebase', () => ({ firestore: {} }))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  getDoc: vi.fn(),
}))
vi.mock('@/lib/admin-registration', () => ({ registerAdmin: vi.fn() }))

const cpf = '52998224725'
const target = '64487570239'

function request(value: unknown, cookie?: string) {
  return new NextRequest('http://localhost/api/admin/users', {
    method: 'POST',
    headers: cookie ? { cookie: `admin_session=${cookie}` } : undefined,
    body: JSON.stringify({ cpf: value }),
  })
}

beforeEach(() => {
  vi.stubEnv('ADMIN_SESSION_SECRET', 'a-secret-with-at-least-32-characters-for-tests')
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('endpoint de cadastro administrativo', () => {
  it('nega acesso sem sessão', async () => {
    expect((await POST(request(target))).status).toBe(401)
    expect(getDoc).not.toHaveBeenCalled()
    expect(registerAdmin).not.toHaveBeenCalled()
  })

  it('nega acesso quando o administrador perdeu a permissão', async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => ({ isAdmin: false }) } as never)

    expect((await POST(request(target, createAdminSession(cpf)))).status).toBe(401)
    expect(registerAdmin).not.toHaveBeenCalled()
  })

  it('rejeita CPF inválido sem gravar', async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => ({ isAdmin: true }) } as never)

    expect((await POST(request('123', createAdminSession(cpf)))).status).toBe(400)
    expect(registerAdmin).not.toHaveBeenCalled()
  })

  it('cadastra um novo administrador usando o CPF sem pontuação', async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => ({ isAdmin: true }) } as never)
    vi.mocked(registerAdmin).mockResolvedValue('created')

    const response = await POST(request('644.875.702-39', createAdminSession(cpf)))
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ cpf: target, isAdmin: true, result: 'created' })
    expect(registerAdmin).toHaveBeenCalledWith(target)
  })

  it('informa promoção ou cadastro existente', async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => ({ isAdmin: true }) } as never)
    vi.mocked(registerAdmin).mockResolvedValueOnce('promoted').mockResolvedValueOnce('already-admin')
    const cookie = createAdminSession(cpf)

    expect((await POST(request(target, cookie))).status).toBe(200)
    expect((await POST(request(target, cookie))).status).toBe(409)
  })
})
