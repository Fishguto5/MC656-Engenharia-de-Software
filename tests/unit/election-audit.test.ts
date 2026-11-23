import { beforeEach, describe, expect, it, vi } from 'vitest'
import { collection, doc, getDoc, getDocs, runTransaction, setDoc } from 'firebase/firestore'
import { ensureElectionClosure, getElectionReport, recordElectionAction } from '@/lib/election-audit'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/firebase', () => ({ firestore: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), doc: vi.fn(), getDoc: vi.fn(), getDocs: vi.fn(), runTransaction: vi.fn(), setDoc: vi.fn(),
  Timestamp: { now: () => new Date('2026-11-21T12:00:00Z'), fromDate: (date: Date) => date },
}))

const transactionGet = vi.fn()
const transactionSet = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(collection).mockImplementation((...args) => args.slice(1).join('/') as never)
  vi.mocked(doc).mockImplementation((...args) => (typeof args[0] === 'string' ? (args.length === 1 ? `${args[0]}/new-event` : args.join('/')) : args.slice(1).join('/')) as never)
  vi.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => ({
    title: 'Eleição teste', type: 'public-consultation', status: 'open',
    startsAt: new Date('2020-01-01T00:00:00Z'), endsAt: new Date('2020-01-02T00:00:00Z'),
  }) } as never)
  vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never)
  transactionGet.mockResolvedValue({ exists: () => false })
  vi.mocked(runTransaction).mockImplementation(async (_db, callback) => callback({ get: transactionGet, set: transactionSet } as never) as never)
})

describe('histórico administrativo', () => {
  it('registra somente ação, responsável e horário, sem conteúdo de votos', async () => {
    await recordElectionAction('eleicao-1', 'edited', '64487570239')
    expect(setDoc).toHaveBeenCalledWith('eleicoes/eleicao-1/historicoAdministrativo/new-event', {
      action: 'edited', actor: '64487570239', occurredAt: new Date('2026-11-21T12:00:00Z'),
    })
  })

  it('registra o encerramento uma vez, na data configurada', async () => {
    const data = { status: 'open', startsAt: new Date('2020-01-01T00:00:00Z'), endsAt: new Date('2020-01-02T00:00:00Z') }
    await ensureElectionClosure('eleicao-1', data)
    expect(transactionSet).toHaveBeenCalledWith('eleicoes/eleicao-1/historicoAdministrativo/closed-auto', {
      action: 'closed', actor: 'Sistema', occurredAt: data.endsAt,
    })

    transactionSet.mockClear()
    transactionGet.mockResolvedValue({ exists: () => true })
    await ensureElectionClosure('eleicao-1', data)
    expect(transactionSet).not.toHaveBeenCalled()
  })

  it('inclui o histórico no relatório da eleição', async () => {
    transactionGet.mockResolvedValue({ exists: () => true })
    vi.mocked(getDocs).mockResolvedValue({ docs: [{ id: 'event-1', data: () => ({
      action: 'created', actor: '64487570239', occurredAt: new Date('2020-01-01T00:00:00Z'),
    }) }] } as never)

    const report = await getElectionReport('eleicao-1')
    expect(report?.history).toEqual([{ id: 'event-1', action: 'created', actor: '64487570239', occurredAt: new Date('2020-01-01T00:00:00Z') }])
  })
})
