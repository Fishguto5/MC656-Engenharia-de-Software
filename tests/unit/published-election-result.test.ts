import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/firebase', () => ({ firestore: {} }))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((...parts: string[]) => parts.join('/')),
  getDoc: vi.fn(),
}))

import { getDoc } from 'firebase/firestore'
import { isOfficiallyPublished, loadPublishedElectionResult, parsePublishedElectionResult } from '@/lib/publishedElectionResult'

const now = new Date('2026-11-21T12:00:00.000Z')
const election = {
  title: 'Presidência 2026',
  type: 'president',
  turno: 1,
  status: 'closed',
  startsAt: '2026-11-01T12:00:00.000Z',
  endsAt: '2026-11-02T12:00:00.000Z',
  publishedAllow: true,
  resultsPublishedAt: '2026-11-03T12:00:00.000Z',
}

const consolidated = {
  electionId: 'e1',
  title: election.title,
  type: election.type,
  turno: 1,
  endsAt: election.endsAt,
  publishedAt: election.resultsPublishedAt,
  votosValidos: 7,
  votosBrancos: 1,
  votosNulos: 2,
  totalVotos: 10,
  candidatos: [{ id: 'c1', nome: 'Ana', partido: 'P', numero: 10, votos: 7, eleito: true }],
  segundoTurno: false,
  quocienteEleitoral: null,
  votosLegenda: 0,
  agremiacoes: [],
  consulta: null,
}

describe('resultado publicado ao eleitor', () => {
  it('exige encerramento, horário final e autorização oficial', () => {
    expect(isOfficiallyPublished(election, now)).toBe(true)
    expect(isOfficiallyPublished({ ...election, status: 'open' }, now)).toBe(false)
    expect(isOfficiallyPublished({ ...election, publishedAllow: false }, now)).toBe(false)
    expect(isOfficiallyPublished({ ...election, resultsPublishedAt: null }, now)).toBe(false)
    expect(isOfficiallyPublished({ ...election, endsAt: '2026-12-02T12:00:00.000Z' }, now)).toBe(false)
  })

  it('lê o resultado presidencial e identifica o turno correto', () => {
    expect(parsePublishedElectionResult('e1', election, consolidated, now)?.turno).toBe(1)
    expect(parsePublishedElectionResult('e1', { ...election, turno: 2 }, { ...consolidated, turno: 2 }, now)?.turno).toBe(2)
    expect(parsePublishedElectionResult('e1', { ...election, turno: 2 }, consolidated, now)).toBeNull()
  })

  it('rejeita consolidado ausente, trocado ou inconsistente', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => false } as never)
    expect(await loadPublishedElectionResult('e1', election)).toBeNull()
    expect(parsePublishedElectionResult('e1', election, { ...consolidated, electionId: 'e2' }, now)).toBeNull()
    expect(parsePublishedElectionResult('e1', election, { ...consolidated, totalVotos: 11 }, now)).toBeNull()
  })

  it('aceita distribuição de deputado e consulta pública', () => {
    const deputyElection = { ...election, type: 'deputy', uf: 'SP' }
    const deputyResult = { ...consolidated, type: 'deputy', quocienteEleitoral: 5, votosLegenda: 2,
      agremiacoes: [{ nome: 'P', votosValidos: 7, vagas: 1 }] }
    expect(parsePublishedElectionResult('e1', deputyElection, deputyResult, now)?.agremiacoes).toHaveLength(1)

    const consultationElection = { ...election, type: 'public-consultation', local: 'Brasil' }
    const consultationResult = { ...consolidated, type: 'public-consultation', votosValidos: 10,
      votosBrancos: 0, votosNulos: 0, totalVotos: 10, candidatos: [], consulta: { sim: 6, nao: 4 } }
    expect(parsePublishedElectionResult('e1', consultationElection, consultationResult, now)?.consulta).toEqual({ sim: 6, nao: 4 })
  })
})
