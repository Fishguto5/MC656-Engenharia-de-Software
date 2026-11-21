import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { collection, doc, getDocs, query, runTransaction } from 'firebase/firestore'
import { POST } from '@/app/api/elections/[id]/vote/route'

vi.mock('@/lib/firebase', () => ({ firestore: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), doc: vi.fn(), getDocs: vi.fn(), query: vi.fn(), runTransaction: vi.fn(),
  where: vi.fn(), limit: vi.fn(), increment: (value: number) => ({ increment: value }),
}))

const update = vi.fn()
const get = vi.fn()
const transaction = { get, update }

function request() {
  return new NextRequest('http://localhost/api/elections/eleicao-1/vote', {
    method: 'POST',
    body: JSON.stringify({ type: 'public-consultation', proposalApproved: true }),
  })
}

function election(endsAt: Date) {
  return {
    exists: () => true,
    data: () => ({
      type: 'public-consultation',
      status: 'open',
      startsAt: new Date('2019-01-01T00:00:00Z'),
      endsAt,
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(doc).mockImplementation((...args) => args.slice(1).join('/') as never)
  vi.mocked(collection).mockImplementation((...args) => args.slice(1).join('/') as never)
  vi.mocked(query).mockImplementation(reference => reference as never)
  vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never)
  vi.mocked(runTransaction).mockImplementation(async (_db, callback) => callback(transaction as never) as never)
  get.mockImplementation(async (reference: unknown) => {
    if (reference === 'eleicoes/eleicao-1') return election(new Date('2999-01-02T00:00:00Z'))
    throw new Error('Referência inesperada')
  })
})

describe('registro de voto com relógio do servidor', () => {
  it('recusa votos após o horário final', async () => {
    get.mockResolvedValue(election(new Date('2020-01-02T00:00:00Z')))

    const response = await POST(request(), { params: Promise.resolve({ id: 'eleicao-1' }) })

    expect(response.status).toBe(409)
    expect(update).not.toHaveBeenCalled()
  })

  it('incrementa apenas a opção escolhida durante a votação', async () => {
    get.mockResolvedValue(election(new Date('2999-01-02T00:00:00Z')))

    const response = await POST(request(), { params: Promise.resolve({ id: 'eleicao-1' }) })

    expect(response.status).toBe(200)
    expect(update).toHaveBeenCalledWith('eleicoes/eleicao-1', { sim: { increment: 1 } })
  })

  it('registra voto nominal no candidato encontrado', async () => {
    get.mockImplementation(async (reference: unknown) => {
      if (reference === 'eleicoes/eleicao-1') return {
        exists: () => true,
        data: () => ({
          type: 'president', status: 'open',
          startsAt: new Date('2019-01-01T00:00:00Z'), endsAt: new Date('2999-01-02T00:00:00Z'),
        }),
      }
      if (reference === 'eleicoes/eleicao-1/candidatos/candidato-1') {
        return { exists: () => true, data: () => ({ numero: 10, votos: 3 }) }
      }
      throw new Error('Referência inesperada')
    })
    vi.mocked(getDocs).mockResolvedValue({
      docs: [{ ref: 'eleicoes/eleicao-1/candidatos/candidato-1' }],
    } as never)
    const request = new NextRequest('http://localhost/api/elections/eleicao-1/vote', {
      method: 'POST',
      body: JSON.stringify({ type: 'president', candidateNumber: 10 }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'eleicao-1' }) })

    expect(response.status).toBe(200)
    expect(update).toHaveBeenCalledWith('eleicoes/eleicao-1/candidatos/candidato-1', { votos: { increment: 1 } })
  })
})
