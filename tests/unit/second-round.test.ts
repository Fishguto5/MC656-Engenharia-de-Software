import { beforeEach, describe, expect, it, vi } from 'vitest'
import { collection, doc, getDoc, runTransaction } from 'firebase/firestore'
import { getAdminElectionResult } from '@/lib/election-results'
import { createSecondRound, getSecondRoundSetup } from '@/lib/second-round'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/firebase', () => ({ firestore: {} }))
vi.mock('@/lib/election-results', () => ({ getAdminElectionResult: vi.fn() }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), doc: vi.fn(), getDoc: vi.fn(), runTransaction: vi.fn(),
  Timestamp: { now: () => new Date('2026-11-21T12:00:00Z'), fromDate: (date: Date) => date },
}))

const firstEnd = new Date('2026-11-20T12:00:00Z')
const start = new Date('2999-01-01T12:00:00Z')
const end = new Date('2999-01-02T12:00:00Z')
const candidates = [
  { id: 'ana', nome: 'Ana', partido: 'A', numero: 10, votos: 40, eleito: false },
  { id: 'bia', nome: 'Bia', partido: 'B', numero: 20, votos: 35, eleito: false },
  { id: 'caio', nome: 'Caio', partido: 'C', numero: 30, votos: 25, eleito: false },
]
let parentData: Record<string, unknown>
const transactionGet = vi.fn()
const transactionSet = vi.fn()
const transactionUpdate = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  parentData = {
    title: 'Presidência', description: 'Eleição nacional', type: 'president', turno: 1,
    status: 'open', startsAt: new Date('2026-11-19T12:00:00Z'), endsAt: firstEnd,
  }
  vi.mocked(collection).mockImplementation((...args) => args.slice(1).join('/') as never)
  vi.mocked(doc).mockImplementation((...args) => {
    const path = args.length === 1
      ? `${args[0]}/second-id`
      : typeof args[0] === 'string' ? args.join('/') : args.slice(1).join('/')
    return { path, id: path.split('/').at(-1) } as never
  })
  vi.mocked(getDoc).mockImplementation(async () => ({ exists: () => true, data: () => parentData }) as never)
  vi.mocked(getAdminElectionResult).mockResolvedValue({
    title: 'Presidência', phase: 'closed', published: false, turno: 1,
    originalElectionId: null, secondRoundElectionId: null,
    result: { segundoTurno: true, candidatos: candidates },
  } as never)
  transactionGet.mockImplementation(async (reference: { path: string }) => reference.path.endsWith('/closed-auto')
    ? { exists: () => false }
    : { exists: () => true, data: () => parentData })
  vi.mocked(runTransaction).mockImplementation(async (_db, callback) => callback({
    get: transactionGet, set: transactionSet, update: transactionUpdate,
  } as never) as never)
})

describe('criação do segundo turno', () => {
  it('exige primeira votação encerrada e apurada', async () => {
    parentData.endsAt = new Date('2999-01-03T00:00:00Z')
    await expect(getSecondRoundSetup('first-id')).rejects.toMatchObject({ code: 'NOT_ELIGIBLE' })
    parentData.endsAt = firstEnd
    vi.mocked(getAdminElectionResult).mockResolvedValue({ result: null } as never)
    await expect(getSecondRoundSetup('first-id')).rejects.toMatchObject({ code: 'NOT_ELIGIBLE' })
    expect(runTransaction).not.toHaveBeenCalled()
  })

  it('cria votação vinculada com somente os dois habilitados e contadores zerados', async () => {
    const id = await createSecondRound('first-id', {
      startsAt: start.toISOString(), endsAt: end.toISOString(), candidateIds: ['ana', 'bia'],
    }, '64487570239')

    expect(id).toBe('second-id')
    expect(transactionSet).toHaveBeenCalledWith(expect.objectContaining({ path: 'eleicoes/second-id' }), expect.objectContaining({
      type: 'president', turno: 2, originalElectionId: 'first-id', status: 'scheduled',
      votosBrancos: 0, votosNulos: 0, publishedAllow: false,
    }))
    expect(transactionSet).toHaveBeenCalledWith(expect.objectContaining({ path: 'eleicoes/second-id/candidatos/ana' }), {
      eleicaoId: 'second-id', candidatoId: 'ana', numero: 10, votos: 0,
    })
    expect(transactionSet).toHaveBeenCalledWith(expect.objectContaining({ path: 'eleicoes/second-id/candidatos/bia' }), {
      eleicaoId: 'second-id', candidatoId: 'bia', numero: 20, votos: 0,
    })
    expect(transactionSet.mock.calls.some(([reference]) => reference.path === 'eleicoes/second-id/candidatos/caio')).toBe(false)
    expect(transactionUpdate).toHaveBeenCalledWith(expect.objectContaining({ path: 'eleicoes/first-id' }), expect.objectContaining({ secondRoundElectionId: 'second-id' }))
    expect(transactionSet).toHaveBeenCalledWith(expect.objectContaining({ path: 'eleicoes/first-id/historicoAdministrativo/second-id' }), expect.objectContaining({ action: 'second_round_created', actor: '64487570239' }))
  })

  it('recusa candidatos fora da apuração e criação duplicada', async () => {
    await expect(createSecondRound('first-id', {
      startsAt: start.toISOString(), endsAt: end.toISOString(), candidateIds: ['ana', 'caio'],
    }, '64487570239')).rejects.toMatchObject({ code: 'INVALID_CANDIDATES' })
    parentData.secondRoundElectionId = 'existing-id'
    await expect(createSecondRound('first-id', {
      startsAt: start.toISOString(), endsAt: end.toISOString(), candidateIds: ['ana', 'bia'],
    }, '64487570239')).rejects.toMatchObject({ code: 'ALREADY_EXISTS' })
    expect(runTransaction).not.toHaveBeenCalled()
  })

  it('recusa período anterior ao encerramento do primeiro turno', async () => {
    await expect(createSecondRound('first-id', {
      startsAt: new Date('2026-11-20T11:00:00Z').toISOString(), endsAt: end.toISOString(), candidateIds: ['ana', 'bia'],
    }, '64487570239')).rejects.toMatchObject({ code: 'INVALID_PERIOD' })
  })
})
