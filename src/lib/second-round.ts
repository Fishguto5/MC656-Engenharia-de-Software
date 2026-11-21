import 'server-only'

import { Timestamp, collection, doc, getDoc, runTransaction } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import { asElectionDate, canPublishResults } from '@/lib/election-timing'
import { getAdminElectionResult, type CandidateResult } from '@/lib/election-results'

export class SecondRoundError extends Error {
  constructor(public code: 'NOT_FOUND' | 'NOT_ELIGIBLE' | 'ALREADY_EXISTS' | 'INVALID_PERIOD' | 'INVALID_CANDIDATES', message: string) {
    super(message)
  }
}

export type SecondRoundSetup = {
  originalId: string
  title: string
  firstRoundEndsAt: Date
  candidates: [CandidateResult, CandidateResult]
  existingId: string | null
}

export async function getSecondRoundSetup(originalId: string): Promise<SecondRoundSetup> {
  const original = await getDoc(doc(firestore, 'eleicoes', originalId))
  if (!original.exists()) throw new SecondRoundError('NOT_FOUND', 'Eleição original não encontrada.')
  const data = original.data()
  if (data.type !== 'president' || (data.turno ?? 1) !== 1 || data.originalElectionId) {
    throw new SecondRoundError('NOT_ELIGIBLE', 'O segundo turno está disponível apenas para a primeira votação presidencial.')
  }
  if (!canPublishResults(data.status, data.startsAt, data.endsAt)) {
    throw new SecondRoundError('NOT_ELIGIBLE', 'A primeira votação ainda não foi encerrada.')
  }
  const firstRoundEndsAt = asElectionDate(data.endsAt)
  if (!firstRoundEndsAt) throw new SecondRoundError('NOT_ELIGIBLE', 'Período da eleição original inválido.')

  const view = await getAdminElectionResult(originalId)
  const result = view.result
  if (!result || !result.segundoTurno || result.candidatos.length < 2) {
    throw new SecondRoundError('NOT_ELIGIBLE', 'A apuração da primeira votação não exige segundo turno.')
  }
  if (result.candidatos.length > 2 && result.candidatos[1].votos === result.candidatos[2].votos) {
    throw new SecondRoundError('NOT_ELIGIBLE', 'Há empate na segunda colocação. É necessário definir os habilitados antes de criar o segundo turno.')
  }
  const candidates = [result.candidatos[0], result.candidatos[1]] as [CandidateResult, CandidateResult]
  if (candidates[0].id === candidates[1].id || candidates[0].numero === candidates[1].numero) {
    throw new SecondRoundError('NOT_ELIGIBLE', 'Os candidatos habilitados têm identificação ou número duplicado.')
  }
  return {
    originalId,
    title: view.title,
    firstRoundEndsAt,
    candidates,
    existingId: typeof data.secondRoundElectionId === 'string' ? data.secondRoundElectionId : null,
  }
}

export async function createSecondRound(originalId: string, input: {
  startsAt?: unknown
  endsAt?: unknown
  candidateIds?: unknown
}, actor: string): Promise<string> {
  const setup = await getSecondRoundSetup(originalId)
  if (setup.existingId) throw new SecondRoundError('ALREADY_EXISTS', 'O segundo turno já foi criado.')
  const startsAt = typeof input.startsAt === 'string' ? new Date(input.startsAt) : null
  const endsAt = typeof input.endsAt === 'string' ? new Date(input.endsAt) : null
  if (!startsAt || !endsAt || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())
    || startsAt <= new Date() || startsAt <= setup.firstRoundEndsAt || endsAt <= startsAt) {
    throw new SecondRoundError('INVALID_PERIOD', 'Configure início futuro após o primeiro turno e término posterior ao início.')
  }
  const eligibleIds = setup.candidates.map(candidate => candidate.id)
  if (!Array.isArray(input.candidateIds) || input.candidateIds.length !== 2
    || input.candidateIds.some(id => typeof id !== 'string' || !eligibleIds.includes(id))
    || new Set(input.candidateIds).size !== 2) {
    throw new SecondRoundError('INVALID_CANDIDATES', 'Selecione os dois candidatos habilitados pela apuração.')
  }

  const originalRef = doc(firestore, 'eleicoes', originalId)
  const secondRef = doc(collection(firestore, 'eleicoes'))
  const firstClosureRef = doc(firestore, 'eleicoes', originalId, 'historicoAdministrativo', 'closed-auto')
  const originalAuditRef = doc(collection(firestore, 'eleicoes', originalId, 'historicoAdministrativo'))
  const secondAuditRef = doc(collection(firestore, 'eleicoes', secondRef.id, 'historicoAdministrativo'))

  await runTransaction(firestore, async (transaction) => {
    const current = await transaction.get(originalRef)
    const firstClosure = await transaction.get(firstClosureRef)
    if (!current.exists()) throw new SecondRoundError('NOT_FOUND', 'Eleição original não encontrada.')
    const data = current.data()
    if (data.type !== 'president' || (data.turno ?? 1) !== 1
      || !canPublishResults(data.status, data.startsAt, data.endsAt)) {
      throw new SecondRoundError('NOT_ELIGIBLE', 'A primeira votação não está apta para segundo turno.')
    }
    if (data.secondRoundElectionId) throw new SecondRoundError('ALREADY_EXISTS', 'O segundo turno já foi criado.')
    const currentEnd = asElectionDate(data.endsAt)
    if (!currentEnd || startsAt <= currentEnd) throw new SecondRoundError('INVALID_PERIOD', 'O segundo turno deve começar após o primeiro.')

    const now = Timestamp.now()
    transaction.set(secondRef, {
      title: `${setup.title} — 2º turno`,
      description: typeof data.description === 'string' ? data.description : '',
      type: 'president',
      turno: 2,
      originalElectionId: originalId,
      startsAt: Timestamp.fromDate(startsAt),
      endsAt: Timestamp.fromDate(endsAt),
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
      publishedAllow: false,
      votosBrancos: 0,
      votosNulos: 0,
    })
    for (const candidate of setup.candidates) {
      transaction.set(doc(firestore, 'eleicoes', secondRef.id, 'candidatos', candidate.id), {
        eleicaoId: secondRef.id,
        candidatoId: candidate.id,
        numero: candidate.numero,
        votos: 0,
      })
    }
    transaction.update(originalRef, { secondRoundElectionId: secondRef.id, updatedAt: now })
    if (!firstClosure.exists()) {
      transaction.set(firstClosureRef, { action: 'closed', actor: 'Sistema', occurredAt: Timestamp.fromDate(currentEnd) })
    }
    transaction.set(originalAuditRef, { action: 'second_round_created', actor, occurredAt: now })
    transaction.set(secondAuditRef, { action: 'created', actor, occurredAt: now })
  })
  return secondRef.id
}
