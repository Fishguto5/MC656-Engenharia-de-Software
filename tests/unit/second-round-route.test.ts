import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/admin/elections/[id]/second-round/route'
import { getAuthorizedAdmin } from '@/lib/admin-session'
import { createSecondRound, SecondRoundError } from '@/lib/second-round'

vi.mock('@/lib/admin-session', () => ({ ADMIN_COOKIE: 'admin_session', getAuthorizedAdmin: vi.fn() }))
vi.mock('@/lib/second-round', () => ({ createSecondRound: vi.fn(), SecondRoundError: class extends Error {
  constructor(public code: string, message: string) { super(message) }
} }))

function request() {
  return new NextRequest('http://localhost/api/admin/elections/first-id/second-round', {
    method: 'POST',
    body: JSON.stringify({ startsAt: '2999-01-01T00:00:00Z', endsAt: '2999-01-02T00:00:00Z', candidateIds: ['ana', 'bia'] }),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => vi.clearAllMocks())

describe('rota administrativa do segundo turno', () => {
  it('recusa acesso sem sessão de administrador', async () => {
    vi.mocked(getAuthorizedAdmin).mockResolvedValue(null)
    const response = await POST(request(), { params: Promise.resolve({ id: 'first-id' }) })
    expect(response.status).toBe(401)
    expect(createSecondRound).not.toHaveBeenCalled()
  })

  it('atribui a criação ao CPF autenticado', async () => {
    vi.mocked(getAuthorizedAdmin).mockResolvedValue('64487570239')
    vi.mocked(createSecondRound).mockResolvedValue('second-id')
    const response = await POST(request(), { params: Promise.resolve({ id: 'first-id' }) })
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ id: 'second-id' })
    expect(createSecondRound).toHaveBeenCalledWith('first-id', expect.objectContaining({ candidateIds: ['ana', 'bia'] }), '64487570239')
  })

  it('expõe conflito quando já existe segundo turno', async () => {
    vi.mocked(getAuthorizedAdmin).mockResolvedValue('64487570239')
    vi.mocked(createSecondRound).mockRejectedValue(new SecondRoundError('ALREADY_EXISTS', 'O segundo turno já foi criado.'))
    const response = await POST(request(), { params: Promise.resolve({ id: 'first-id' }) })
    expect(response.status).toBe(409)
  })
})
