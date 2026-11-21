import { beforeEach, describe, expect, it, vi } from 'vitest'
import { collection, doc, getDoc, getDocs, runTransaction } from 'firebase/firestore'
import { getAdminElectionResult, getPublishedResult, publishElectionResult, ResultPublicationError } from '@/lib/election-results'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/firebase', () => ({ firestore: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), doc: vi.fn(), getDoc: vi.fn(), getDocs: vi.fn(), runTransaction: vi.fn(),
  Timestamp: { fromDate: (date: Date) => date },
}))

const set = vi.fn()
const update = vi.fn()
const get = vi.fn()
const transaction = { get, set, update }

function electionSnapshot(endsAt: Date, extra: Record<string, unknown> = {}) {
  return {
    exists: () => true,
    data: () => ({
      title: 'Consulta 2026',
      type: 'public-consultation',
      status: 'open',
      startsAt: new Date('2019-01-01T00:00:00Z'),
      endsAt,
      sim: 12,
      nao: 3,
      ...extra,
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(doc).mockImplementation((...args) => args.slice(1).join('/') as never)
  vi.mocked(collection).mockImplementation((...args) => args.slice(1).join('/') as never)
  vi.mocked(getDoc).mockImplementation(async (reference) => {
    if ((reference as unknown) === 'eleicoes/eleicao-1') {
      return electionSnapshot(new Date('2020-01-02T00:00:00Z')) as never
    }
    if ((reference as unknown) === 'eleicoes/eleicao-1/resultados/consolidado') return { exists: () => false } as never
    throw new Error('Referência inesperada')
  })
  vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never)
  vi.mocked(runTransaction).mockImplementation(async (_db, callback) => callback(transaction as never) as never)
  get.mockImplementation(async (reference: unknown) => {
    if (reference === 'eleicoes/eleicao-1') return electionSnapshot(new Date('2020-01-02T00:00:00Z'))
    if (reference === 'eleicoes/eleicao-1/resultados/consolidado') return { exists: () => false }
    throw new Error('Referência inesperada')
  })
})

describe('publicação de resultados', () => {
  it('não publica antes do encerramento', async () => {
    vi.mocked(getDoc).mockResolvedValue(electionSnapshot(new Date('2999-01-01T00:00:00Z')) as never)

    await expect(publishElectionResult('eleicao-1')).rejects.toMatchObject({ code: 'NOT_CLOSED' } satisfies Partial<ResultPublicationError>)
    expect(runTransaction).not.toHaveBeenCalled()
    expect(set).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('publica um consolidado e a marca de visibilidade sem modificar os votos', async () => {
    const result = await publishElectionResult('eleicao-1')

    expect(result).toMatchObject({
      votosValidos: 15,
      totalVotos: 15,
      consulta: { sim: 12, nao: 3 },
    })
    expect(result.publishedAt).toBeTruthy()
    expect(set).toHaveBeenCalledWith('eleicoes/eleicao-1/resultados/consolidado', result)
    expect(update).toHaveBeenCalledOnce()
    expect(update.mock.calls[0][0]).toBe('eleicoes/eleicao-1')
    expect(update.mock.calls[0][1]).toMatchObject({ status: 'closed', publishedAllow: true })
    expect(Object.keys(update.mock.calls[0][1])).toEqual(['status', 'publishedAllow', 'resultsPublishedAt'])
  })

  it('mostra prévia ao administrador após o encerramento sem gravar nada', async () => {
    const view = await getAdminElectionResult('eleicao-1')

    expect(view.result?.consulta).toEqual({ sim: 12, nao: 3 })
    expect(view.published).toBe(false)
    expect(set).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('apresenta os votos registrados para os candidatos e os votos brancos e nulos', async () => {
    vi.mocked(getDoc).mockImplementation(async (reference) => {
      if ((reference as unknown) === 'eleicoes/eleicao-1') return {
        exists: () => true,
        data: () => ({
          title: 'Presidência', type: 'president', status: 'closed',
          startsAt: new Date('2019-01-01T00:00:00Z'), endsAt: new Date('2020-01-02T00:00:00Z'),
          votosBrancos: 2, votosNulos: 1,
        }),
      } as never
      if ((reference as unknown) === 'candidatos/candidato-1') return {
        exists: () => true,
        data: () => ({ nome: 'Ana', partido: 'ABC', dataNascimento: new Date('1980-01-01T00:00:00Z') }),
      } as never
      throw new Error('Referência inesperada')
    })
    vi.mocked(getDocs).mockResolvedValue({
      docs: [{ id: 'candidato-1', data: () => ({ candidatoId: 'candidato-1', numero: 10, votos: 7 }) }],
    } as never)

    const view = await getAdminElectionResult('eleicao-1')

    expect(view.result).toMatchObject({
      votosValidos: 7, votosBrancos: 2, votosNulos: 1, totalVotos: 10,
      candidatos: [{ nome: 'Ana', numero: 10, votos: 7 }],
    })
    expect(runTransaction).not.toHaveBeenCalled()
  })

  it('apura eleição para deputado sem votos quando a federação do candidato está vazia', async () => {
    vi.mocked(getDoc).mockImplementation(async (reference) => {
      if ((reference as unknown) === 'eleicoes/eleicao-1') return {
        exists: () => true,
        data: () => ({
          title: 'Deputados', type: 'deputy', status: 'closed', uf: 'SP',
          startsAt: new Date('2019-01-01T00:00:00Z'), endsAt: new Date('2020-01-02T00:00:00Z'),
          votosBrancos: 0, votosNulos: 0, votosLegenda: { ABC: 0 },
        }),
      } as never
      if ((reference as unknown) === 'candidatos/candidato-1') return {
        exists: () => true,
        data: () => ({ nome: 'Ana', partido: 'ABC', federacao: '', dataNascimento: new Date('1980-01-01T00:00:00Z') }),
      } as never
      throw new Error('Referência inesperada')
    })
    vi.mocked(getDocs).mockResolvedValue({
      docs: [{ id: 'candidato-1', data: () => ({ candidatoId: 'candidato-1', numero: 10, votos: 0 }) }],
    } as never)

    const view = await getAdminElectionResult('eleicao-1')

    expect(view.result).toMatchObject({
      totalVotos: 0, votosValidos: 0, quocienteEleitoral: 0,
      candidatos: [{ nome: 'Ana', votos: 0, eleito: false }],
      agremiacoes: [{ nome: 'ABC', votosValidos: 0, vagas: 0 }],
    })
  })

  it('não entrega ao público um resultado sem autorização de publicação', async () => {
    expect(await getPublishedResult('eleicao-1')).toBeNull()
    expect(getDoc).toHaveBeenCalledTimes(1)
  })

  it('mostra a apuração real quando a eleição encerrada é marcada como publicada no banco', async () => {
    vi.mocked(getDoc).mockImplementation(async (reference) => {
      if ((reference as unknown) === 'eleicoes/eleicao-1') {
        return electionSnapshot(new Date('2020-01-02T00:00:00Z'), { publishedAllow: true }) as never
      }
      if ((reference as unknown) === 'eleicoes/eleicao-1/resultados/consolidado') {
        return { exists: () => false } as never
      }
      throw new Error('Referência inesperada')
    })

    const result = await getPublishedResult('eleicao-1')

    expect(result).toMatchObject({ totalVotos: 15, consulta: { sim: 12, nao: 3 }, publishedAt: null })
    expect(set).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('não mostra resultado quando publishedAllow está falso', async () => {
    vi.mocked(getDoc).mockResolvedValue(electionSnapshot(new Date('2020-01-02T00:00:00Z'), {
      publishedAllow: false,
      resultsPublishedAt: new Date('2020-01-03T00:00:00Z'),
    }) as never)

    expect(await getPublishedResult('eleicao-1')).toBeNull()
    expect(getDoc).toHaveBeenCalledTimes(1)
  })
})
