import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/firebase', () => ({ firestore: {} }))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((...parts: string[]) => parts.slice(1).join('/')),
  getDoc: vi.fn(),
}))

import { getDoc } from 'firebase/firestore'
import { POST } from '@/app/api/elections/[id]/participation/route'

const params = { params: Promise.resolve({ id: 'eleicao-1' }) }

function request(cpf = '52998224725', uf = 'SP') {
  return new NextRequest('http://localhost/api/elections/eleicao-1/participation', {
    method: 'POST', body: JSON.stringify({ cpf, uf }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.VOTER_PARTICIPATION_SECRET = 'test-secret-with-at-least-thirty-two-characters'
})

describe('consulta de participação', () => {
  it('informa se há voto registrado sem revelar CPF ou escolha', async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true } as never)
    const response = await POST(request(), params)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ hasVoted: true })
  })

  it('recusa CPF inválido e falha fechada quando a leitura falha', async () => {
    expect((await POST(request('11111111111'), params)).status).toBe(400)
    vi.mocked(getDoc).mockRejectedValue(new Error('Firestore indisponível'))
    expect((await POST(request(), params)).status).toBe(503)
  })
})
