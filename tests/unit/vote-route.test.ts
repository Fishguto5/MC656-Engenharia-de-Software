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
const set = vi.fn()
const transaction = { get, update, set }
const cpf = '52998224725'

function request() {
  return new NextRequest('http://localhost/api/elections/eleicao-1/vote', {
    method: 'POST',
    body: JSON.stringify({ type: 'public-consultation', proposalApproved: true, cpf, uf: 'SP' }),
  })
}

function election(endsAt: Date) {
  return {
    exists: () => true,
    data: () => ({
      type: 'public-consultation',
      local: 'Brasil',
      status: 'open',
      startsAt: new Date('2019-01-01T00:00:00Z'),
      endsAt,
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.VOTER_PARTICIPATION_SECRET = 'test-secret-with-at-least-thirty-two-characters'
  vi.mocked(doc).mockImplementation((...args) => args.slice(1).join('/') as never)
  vi.mocked(collection).mockImplementation((...args) => args.slice(1).join('/') as never)
  vi.mocked(query).mockImplementation(reference => reference as never)
  vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never)
  vi.mocked(runTransaction).mockImplementation(async (_db, callback) => callback(transaction as never) as never)
  get.mockImplementation(async (reference: unknown) => {
    if (reference === 'eleicoes/eleicao-1') return election(new Date('2999-01-02T00:00:00Z'))
    if (typeof reference === 'string' && reference.includes('/participacoes/')) return { exists: () => false }
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
    const response = await POST(request(), { params: Promise.resolve({ id: 'eleicao-1' }) })

    expect(response.status).toBe(200)
    expect(update).toHaveBeenCalledWith('eleicoes/eleicao-1', { sim: { increment: 1 } })
    expect(set).toHaveBeenCalledOnce()
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
      if (typeof reference === 'string' && reference.includes('/participacoes/')) return { exists: () => false }
      throw new Error('Referência inesperada')
    })
    vi.mocked(getDocs).mockResolvedValue({
      docs: [{ ref: 'eleicoes/eleicao-1/candidatos/candidato-1' }],
    } as never)
    const request = new NextRequest('http://localhost/api/elections/eleicao-1/vote', {
      method: 'POST',
      body: JSON.stringify({ type: 'president', candidateNumber: 10, cpf, uf: 'SP' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'eleicao-1' }) })

    expect(response.status).toBe(200)
    expect(update).toHaveBeenCalledWith('eleicoes/eleicao-1/candidatos/candidato-1', { votos: { increment: 1 } })
  })

  it('contabiliza o voto do segundo turno somente na nova eleição', async () => {
    get.mockImplementation(async (reference: unknown) => {
      if (reference === 'eleicoes/segundo-1') return {
        exists: () => true,
        data: () => ({
          type: 'president', turno: 2, originalElectionId: 'primeiro-1', status: 'scheduled',
          startsAt: new Date('2019-01-01T00:00:00Z'), endsAt: new Date('2999-01-02T00:00:00Z'),
        }),
      }
      if (reference === 'eleicoes/segundo-1/candidatos/ana') return {
        exists: () => true, data: () => ({ numero: 10, votos: 0 }),
      }
      if (typeof reference === 'string' && reference.includes('/participacoes/')) return { exists: () => false }
      throw new Error('Referência inesperada')
    })
    vi.mocked(getDocs).mockResolvedValue({ docs: [{ ref: 'eleicoes/segundo-1/candidatos/ana' }] } as never)
    const secondVote = new NextRequest('http://localhost/api/elections/segundo-1/vote', {
      method: 'POST', body: JSON.stringify({ type: 'president', candidateNumber: 10, cpf, uf: 'SP' }),
    })

    const response = await POST(secondVote, { params: Promise.resolve({ id: 'segundo-1' }) })

    expect(response.status).toBe(200)
    expect(update).toHaveBeenCalledExactlyOnceWith('eleicoes/segundo-1/candidatos/ana', { votos: { increment: 1 } })
  })

  it('recusa novo voto quando o CPF já participou', async () => {
    get.mockImplementation(async (reference: unknown) => {
      if (reference === 'eleicoes/eleicao-1') return election(new Date('2999-01-02T00:00:00Z'))
      return { exists: () => true }
    })

    const response = await POST(request(), { params: Promise.resolve({ id: 'eleicao-1' }) })
    expect(response.status).toBe(409)
    expect(update).not.toHaveBeenCalled()
    expect(set).not.toHaveBeenCalled()
  })

  it('registra apenas um voto em tentativas simultâneas do mesmo CPF', async () => {
    let registered = false
    vi.mocked(runTransaction).mockImplementation(async (_db, callback) => {
      const result = await callback({
        get: async (reference: unknown) => reference === 'eleicoes/eleicao-1'
          ? election(new Date('2999-01-02T00:00:00Z'))
          : { exists: () => registered },
        update,
        set: (...args: unknown[]) => {
          registered = true
          set(...args)
        },
      } as never)
      return result as never
    })

    const responses = await Promise.all([
      POST(request(), { params: Promise.resolve({ id: 'eleicao-1' }) }),
      POST(request(), { params: Promise.resolve({ id: 'eleicao-1' }) }),
    ])
    expect(responses.map(response => response.status).sort()).toEqual([200, 409])
    expect(update).toHaveBeenCalledOnce()
    expect(set).toHaveBeenCalledOnce()
  })

  it('recusa CPF inválido e consulta de outra UF', async () => {
    const invalid = new NextRequest('http://localhost/api/elections/eleicao-1/vote', {
      method: 'POST', body: JSON.stringify({ type: 'public-consultation', proposalApproved: true, cpf: '11111111111', uf: 'SP' }),
    })
    expect((await POST(invalid, { params: Promise.resolve({ id: 'eleicao-1' }) })).status).toBe(400)
    get.mockResolvedValue({ exists: () => true, data: () => ({ ...election(new Date('2999-01-02T00:00:00Z')).data(), local: 'RJ' }) })
    expect((await POST(request(), { params: Promise.resolve({ id: 'eleicao-1' }) })).status).toBe(403)
    expect(update).not.toHaveBeenCalled()
  })
})
