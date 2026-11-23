import { type ElectionType, VALID_ELECTION_TYPE } from '@/lib/constants/election'
import { ELECTION_COLLECTION } from '@/lib/constants/firebase'
import { firestore } from '@/lib/firebase'
import { doc, getDoc, type DocumentData } from 'firebase/firestore'

export type CandidateResult = {
  id: string
  nome: string
  partido: string
  numero: number
  votos: number
  eleito: boolean
}

export type PublishedElectionResult = {
  electionId: string
  title: string
  type: ElectionType
  turno: 1 | 2
  endsAt: Date
  publishedAt: Date
  votosValidos: number
  votosBrancos: number
  votosNulos: number
  totalVotos: number
  candidatos: CandidateResult[]
  segundoTurno: boolean
  quocienteEleitoral: number | null
  votosLegenda: number
  agremiacoes: Array<{ nome: string, votosValidos: number, vagas: number }>
  consulta: { sim: number, nao: number } | null
}

function readDate(value: unknown): Date | null {
  const date = typeof value === 'string'
    ? new Date(value)
    : value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function'
      ? value.toDate() as unknown
      : null
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null
}

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function isOfficiallyPublished(election: DocumentData, now = new Date()): boolean {
  const startsAt = readDate(election.startsAt)
  const endsAt = readDate(election.endsAt)
  const publishedAt = readDate(election.resultsPublishedAt)
  return election.status === 'closed'
    && startsAt !== null
    && endsAt !== null
    && endsAt > startsAt
    && now >= endsAt
    && election.publishedAllow === true
    && publishedAt !== null
    && publishedAt <= now
}

export function parsePublishedElectionResult(id: string, election: DocumentData, raw: DocumentData, now = new Date()): PublishedElectionResult | null {
  if (!isOfficiallyPublished(election, now) || !isRecord(raw)) return null
  if (raw.electionId !== id || typeof raw.type !== 'string' || raw.type !== election.type || !VALID_ELECTION_TYPE.has(raw.type)) return null
  if (typeof election.title !== 'string' || !election.title.trim() || raw.title !== election.title) return null

  const endsAt = readDate(election.endsAt)
  const resultEndsAt = readDate(raw.endsAt)
  const publishedAt = readDate(raw.publishedAt)
  const electionPublishedAt = readDate(election.resultsPublishedAt)
  if (!endsAt || !resultEndsAt || endsAt.getTime() !== resultEndsAt.getTime()
    || !publishedAt || !electionPublishedAt || publishedAt.getTime() !== electionPublishedAt.getTime()) return null

  const turno = election.type === 'president' && election.turno === 2 ? 2 : 1
  if (raw.turno !== turno) return null
  if (!isCount(raw.votosValidos) || !isCount(raw.votosBrancos) || !isCount(raw.votosNulos)
    || !isCount(raw.totalVotos) || !isCount(raw.votosLegenda)
    || raw.totalVotos !== raw.votosValidos + raw.votosBrancos + raw.votosNulos
    || typeof raw.segundoTurno !== 'boolean') return null

  if (!Array.isArray(raw.candidatos) || !raw.candidatos.every((candidate: unknown) => isRecord(candidate)
    && typeof candidate.id === 'string' && typeof candidate.nome === 'string'
    && typeof candidate.partido === 'string' && isCount(candidate.numero)
    && isCount(candidate.votos) && typeof candidate.eleito === 'boolean')) return null

  if (!Array.isArray(raw.agremiacoes) || !raw.agremiacoes.every((item: unknown) => isRecord(item)
    && typeof item.nome === 'string' && isCount(item.votosValidos) && isCount(item.vagas))) return null

  if (raw.quocienteEleitoral !== null && !isCount(raw.quocienteEleitoral)) return null
  if (raw.consulta !== null && (!isRecord(raw.consulta) || !isCount(raw.consulta.sim) || !isCount(raw.consulta.nao))) return null
  if (election.type === 'public-consultation') {
    if (!isRecord(raw.consulta) || raw.votosValidos !== (raw.consulta.sim as number) + (raw.consulta.nao as number)) return null
  }
  else if (raw.consulta !== null) return null

  return {
    electionId: id,
    title: raw.title,
    type: raw.type as ElectionType,
    turno,
    endsAt,
    publishedAt,
    votosValidos: raw.votosValidos,
    votosBrancos: raw.votosBrancos,
    votosNulos: raw.votosNulos,
    totalVotos: raw.totalVotos,
    candidatos: raw.candidatos as CandidateResult[],
    segundoTurno: raw.segundoTurno,
    quocienteEleitoral: raw.quocienteEleitoral,
    votosLegenda: raw.votosLegenda,
    agremiacoes: raw.agremiacoes as PublishedElectionResult['agremiacoes'],
    consulta: raw.consulta as PublishedElectionResult['consulta'],
  }
}

export async function loadPublishedElectionResult(id: string, election: DocumentData): Promise<PublishedElectionResult | null> {
  if (!isOfficiallyPublished(election)) return null
  const snapshot = await getDoc(doc(firestore, ELECTION_COLLECTION, id, 'resultados', 'consolidado'))
  if (!snapshot.exists()) return null
  return parsePublishedElectionResult(id, election, snapshot.data())
}
