import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { doc, getDoc } from 'firebase/firestore'
import { NextRequest } from 'next/server'
import { ADMIN_COOKIE, createAdminSession, getAuthorizedAdmin, normalizeCpf, readAdminSession } from '@/lib/admin-session'
import { POST, DELETE } from '@/app/api/admin/session/route'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/firebase', () => ({ firestore: {} }))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  getDoc: vi.fn(),
}))

const cpf = '52998224725'

function snapshot(isAdmin: unknown, exists = true) {
  return { exists: () => exists, data: () => ({ isAdmin }) }
}

beforeEach(() => {
  vi.stubEnv('ADMIN_SESSION_SECRET', 'a-secret-with-at-least-32-characters-for-tests')
  vi.mocked(getDoc).mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('sessão administrativa', () => {
  it('normaliza e valida CPF antes da consulta', () => {
    expect(normalizeCpf('529.982.247-25')).toBe(cpf)
    expect(normalizeCpf('529.982.247-26')).toBeNull()
    expect(normalizeCpf('000.000.000-00')).toBeNull()
  })

  it('rejeita cookie adulterado e expirado', () => {
    const cookie = createAdminSession(cpf)
    expect(readAdminSession(cookie)).toBe(cpf)
    expect(readAdminSession(`${cookie}x`)).toBeNull()
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 9 * 60 * 60 * 1000)
    expect(readAdminSession(cookie)).toBeNull()
  })

  it('reconsulta a permissão administrativa ao autorizar', async () => {
    const cookie = createAdminSession(cpf)
    vi.mocked(getDoc).mockResolvedValueOnce(snapshot(true) as never)
      .mockResolvedValueOnce(snapshot(false) as never)
    expect(await getAuthorizedAdmin(cookie)).toBe(cpf)
    expect(await getAuthorizedAdmin(cookie)).toBeNull()
    expect(doc).toHaveBeenCalledWith(expect.anything(), 'users', cpf)
  })
})

describe('entrada administrativa', () => {
  const request = (value: string) => new NextRequest('http://localhost/api/admin/session', {
    method: 'POST',
    body: JSON.stringify({ cpf: value }),
  })

  it('não consulta o cadastro para CPF inválido', async () => {
    const response = await POST(request('123'))
    expect(response.status).toBe(400)
    expect(getDoc).not.toHaveBeenCalled()
  })

  it('recusa CPF não cadastrado ou sem permissão', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce(snapshot(false, false) as never)
      .mockResolvedValueOnce(snapshot(false) as never)
    expect((await POST(request(cpf))).status).toBe(403)
    expect((await POST(request(cpf))).status).toBe(403)
  })

  it('emite cookie HttpOnly somente para administrador', async () => {
    vi.mocked(getDoc).mockResolvedValue(snapshot(true) as never)
    const response = await POST(request('529.982.247-25'))
    expect(response.status).toBe(200)
    expect(response.cookies.get(ADMIN_COOKIE)?.value).toBeTruthy()
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(response.headers.get('set-cookie')).toContain('SameSite=lax')
  })

  it('apaga a sessão ao sair', async () => {
    const response = await DELETE()
    expect(response.cookies.get(ADMIN_COOKIE)?.value).toBe('')
  })
})
