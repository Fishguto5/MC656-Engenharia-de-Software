import 'server-only'

import { Timestamp, collection, doc, getDoc, getDocs, runTransaction, setDoc, type DocumentData } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import { asElectionDate, canPublishResults, getElectionPhase, type ElectionPhase } from '@/lib/election-timing'

export type ElectionAuditAction = 'created' | 'edited' | 'closed' | 'published' | 'second_round_created'

export type ElectionAuditEntry = {
  id: string
  action: ElectionAuditAction
  actor: string
  occurredAt: Date
}

export const auditActionLabels: Record<ElectionAuditAction, string> = {
  created: 'Criação da eleição',
  edited: 'Edição da eleição',
  closed: 'Encerramento da votação',
  published: 'Publicação dos resultados',
  second_round_created: 'Criação do segundo turno',
}

const auditCollection = (id: string) => collection(firestore, 'eleicoes', id, 'historicoAdministrativo')

export async function recordElectionAction(id: string, action: 'created' | 'edited', actor: string): Promise<void> {
  const election = await getDoc(doc(firestore, 'eleicoes', id))
  if (!election.exists()) throw new Error('Eleição não encontrada para registrar a ação.')
  // O servidor define responsável, ação e horário. Nunca recebe dados de votos no registro.
  await setDoc(doc(auditCollection(id)), { action, actor, occurredAt: Timestamp.now() })
}

export async function ensureElectionClosure(id: string, data: DocumentData): Promise<void> {
  if (!canPublishResults(data.status, data.startsAt, data.endsAt)) return
  const endsAt = asElectionDate(data.endsAt)
  if (!endsAt) return
  const closureRef = doc(auditCollection(id), 'closed-auto')
  await runTransaction(firestore, async (transaction) => {
    const existing = await transaction.get(closureRef)
    if (!existing.exists()) {
      transaction.set(closureRef, {
        action: 'closed',
        actor: 'Sistema',
        occurredAt: Timestamp.fromDate(endsAt),
      })
    }
  })
}

export async function getElectionAudit(id: string): Promise<ElectionAuditEntry[]> {
  const snapshot = await getDocs(auditCollection(id))
  const actions = new Set<ElectionAuditAction>(['created', 'edited', 'closed', 'published', 'second_round_created'])
  return snapshot.docs.flatMap((entry) => {
    const data = entry.data()
    const occurredAt = asElectionDate(data.occurredAt)
    if (!actions.has(data.action) || typeof data.actor !== 'string' || !occurredAt) return []
    return [{ id: entry.id, action: data.action as ElectionAuditAction, actor: data.actor, occurredAt }]
  }).sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
}

export async function getElectionReport(id: string): Promise<{
  title: string
  type: string
  phase: ElectionPhase
  startsAt: Date | null
  endsAt: Date | null
  published: boolean
  turno: 1 | 2
  originalElectionId: string | null
  secondRoundElectionId: string | null
  history: ElectionAuditEntry[]
} | null> {
  const election = await getDoc(doc(firestore, 'eleicoes', id))
  if (!election.exists()) return null
  const data = election.data()
  await ensureElectionClosure(id, data)
  return {
    title: typeof data.title === 'string' && data.title.trim() ? data.title : 'Eleição sem título',
    type: typeof data.type === 'string' ? data.type : '',
    phase: getElectionPhase(data.status, data.startsAt, data.endsAt),
    startsAt: asElectionDate(data.startsAt),
    endsAt: asElectionDate(data.endsAt),
    published: data.publishedAllow === true,
    turno: data.turno === 2 ? 2 : 1,
    originalElectionId: typeof data.originalElectionId === 'string' ? data.originalElectionId : null,
    secondRoundElectionId: typeof data.secondRoundElectionId === 'string' ? data.secondRoundElectionId : null,
    history: await getElectionAudit(id),
  }
}
