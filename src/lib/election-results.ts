import 'server-only'

import { Timestamp, collection, doc, getDoc, getDocs, runTransaction, type DocumentData } from 'firebase/firestore'
import { agremiacaoDe, apurarDeputados, ordenarPorVotacao } from '@/lib/deputado'
import { asElectionDate, canPublishResults, getElectionPhase, type ElectionPhase } from '@/lib/election-timing'
import { LISTA_UFS, VAGAS_DEPUTADO_FEDERAL, type ElectionType, type UF } from '@/lib/constants/election'
import type { VotosCandidato, EleicaoDeputado } from '@/interfaces/eleicaoInterfaces'
import { firestore } from '@/lib/firebase'

export type CandidateResult = {
  id: string
  nome: string
  partido: string
  numero: number
  votos: number
  eleito: boolean
}

export type ElectionResult = {
  electionId: string
  title: string
  type: ElectionType
  endsAt: string
  publishedAt: string | null
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

export type AdminResultView = {
  title: string
  phase: ElectionPhase
  published: boolean
  result: ElectionResult | null
}

export class ResultPublicationError extends Error {
  constructor(public code: 'NOT_FOUND' | 'NOT_CLOSED' | 'ALREADY_PUBLISHED' | 'INVALID_DATA', message: string) {
    super(message)
  }
}

function count(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new ResultPublicationError('INVALID_DATA', `Contagem inválida em ${field}.`)
  }
  return value as number
}

function electionType(value: unknown): ElectionType {
  if (value === 'president' || value === 'deputy' || value === 'public-consultation') return value
  throw new ResultPublicationError('INVALID_DATA', 'Tipo de eleição inválido.')
}

async function loadPreviewInputs(id: string, data: DocumentData) {
  const votes = await getDocs(collection(firestore, 'eleicoes', id, 'candidatos'))
  const candidates = await Promise.all(votes.docs.map(async (vote) => {
    const voteData = vote.data()
    const candidateId = typeof voteData.candidatoId === 'string' ? voteData.candidatoId : vote.id
    const candidate = await getDoc(doc(firestore, 'candidatos', candidateId))
    if (!candidate.exists()) {
      throw new ResultPublicationError('INVALID_DATA', `Cadastro do candidato ${candidateId} não encontrado.`)
    }
    const candidateData = candidate.data()
    const dataNascimento = asElectionDate(candidateData.dataNascimento)
    if (!dataNascimento || typeof candidateData.nome !== 'string' || typeof candidateData.partido !== 'string') {
      throw new ResultPublicationError('INVALID_DATA', `Dados do candidato ${candidateId} incompletos.`)
    }
    return {
      id: candidateId,
      nome: candidateData.nome,
      partido: candidateData.partido,
      federacao: typeof candidateData.federacao === 'string' ? candidateData.federacao : undefined,
      dataNascimento,
      numero: count(voteData.numero, `número do candidato ${candidateId}`),
      votos: count(voteData.votos, `votos do candidato ${candidateId}`),
    } satisfies VotosCandidato
  }))

  return { data, candidates }
}

function isPublished(data: DocumentData): boolean {
  return canPublishResults(data.status, data.startsAt, data.endsAt)
    && data.publishedAllow !== false
    && (data.publishedAllow === true || Boolean(data.resultsPublishedAt))
}

async function publishedResult(id: string, data: DocumentData): Promise<ElectionResult> {
  const snapshot = await getDoc(doc(firestore, 'eleicoes', id, 'resultados', 'consolidado'))
  if (snapshot.exists()) return snapshot.data() as ElectionResult

  const inputs = await loadPreviewInputs(id, data)
  const result = calculateResult(id, inputs.data, inputs.candidates)
  return { ...result, publishedAt: asElectionDate(data.resultsPublishedAt)?.toISOString() ?? null }
}

function calculateResult(id: string, data: DocumentData, candidates: VotosCandidato[]): ElectionResult {
  const type = electionType(data.type)
  const endsAt = asElectionDate(data.endsAt)
  if (!endsAt) throw new ResultPublicationError('INVALID_DATA', 'Data de encerramento inválida.')

  const title = typeof data.title === 'string' && data.title.trim() ? data.title : 'Eleição sem título'
  const votosBrancos = type === 'public-consultation' ? 0 : count(data.votosBrancos, 'votos brancos')
  const votosNulos = type === 'public-consultation' ? 0 : count(data.votosNulos, 'votos nulos')
  const ordered = ordenarPorVotacao(candidates)
  let votosValidos = ordered.reduce((sum, candidate) => sum + candidate.votos, 0)
  let votosLegenda = 0
  let segundoTurno = false
  let quocienteEleitoral: number | null = null
  let agremiacoes: ElectionResult['agremiacoes'] = []
  let consulta: ElectionResult['consulta'] = null
  let electedIds: string[] = []

  if (type === 'president' && votosValidos > 0) {
    const winner = ordered[0]
    segundoTurno = winner.votos * 2 <= votosValidos
    electedIds = segundoTurno ? [] : [winner.id]
  }
  else if (type === 'deputy') {
    const uf = data.uf as UF
    if (!LISTA_UFS.includes(uf)) throw new ResultPublicationError('INVALID_DATA', 'UF da eleição inválida.')
    const legend = data.votosLegenda as Record<string, unknown> | undefined
    const legendEntries = Object.entries(legend ?? {}).map(([name, votes]) => [name, count(votes, `votos de legenda ${name}`)] as const)
    votosLegenda = legendEntries.reduce((sum, [, votes]) => sum + votes, 0)
    const parties = Array.from(new Set([
      ...candidates.map(agremiacaoDe),
      ...legendEntries.map(([name]) => name),
    ]))
    const election = {
      id,
      title,
      description: typeof data.description === 'string' ? data.description : '',
      startsAt: asElectionDate(data.startsAt) ?? endsAt,
      endsAt,
      status: 'closed',
      createdAt: asElectionDate(data.createdAt) ?? endsAt,
      updatedAt: asElectionDate(data.updatedAt) ?? endsAt,
      type: 'deputy',
      uf,
      agremiacoes: parties,
      candidatos: candidates,
      votosLegenda: Object.fromEntries(legendEntries),
      votosBrancos,
      votosNulos,
    } satisfies EleicaoDeputado
    let result
    try {
      result = apurarDeputados(election, VAGAS_DEPUTADO_FEDERAL[uf])
    }
    catch (error) {
      throw new ResultPublicationError('INVALID_DATA', error instanceof Error ? error.message : 'Não foi possível apurar a eleição.')
    }
    votosValidos = result.votosValidos
    quocienteEleitoral = result.quocienteEleitoral
    electedIds = result.eleitos.map(candidate => candidate.id)
    agremiacoes = result.agremiacoes.map(item => ({
      nome: item.agremiacao,
      votosValidos: item.votosValidos,
      vagas: item.vagasQuociente + item.vagasSobras,
    }))
  }
  else if (type === 'public-consultation') {
    consulta = { sim: count(data.sim, 'votos sim'), nao: count(data.nao, 'votos não') }
    votosValidos = consulta.sim + consulta.nao
  }

  const elected = new Set(electedIds)
  return {
    electionId: id,
    title,
    type,
    endsAt: endsAt.toISOString(),
    publishedAt: null,
    votosValidos,
    votosBrancos,
    votosNulos,
    totalVotos: votosValidos + votosBrancos + votosNulos,
    candidatos: ordered.map(candidate => ({
      id: candidate.id,
      nome: candidate.nome,
      partido: candidate.partido,
      numero: candidate.numero,
      votos: candidate.votos,
      eleito: elected.has(candidate.id),
    })),
    segundoTurno,
    quocienteEleitoral,
    votosLegenda,
    agremiacoes,
    consulta,
  }
}

export async function getAdminElectionResult(id: string): Promise<AdminResultView> {
  const election = await getDoc(doc(firestore, 'eleicoes', id))
  if (!election.exists()) throw new ResultPublicationError('NOT_FOUND', 'Eleição não encontrada.')
  const data = election.data() as DocumentData
  const phase = getElectionPhase(data.status, data.startsAt, data.endsAt)
  const title = typeof data.title === 'string' ? data.title : 'Eleição sem título'
  if (!canPublishResults(data.status, data.startsAt, data.endsAt)) {
    return { title, phase, published: false, result: null }
  }

  if (isPublished(data)) {
    return { title, phase, published: true, result: await publishedResult(id, data) }
  }

  const inputs = await loadPreviewInputs(id, data)
  return { title, phase, published: false, result: calculateResult(id, inputs.data, inputs.candidates) }
}

export async function publishElectionResult(id: string, actor: string): Promise<ElectionResult> {
  const electionRef = doc(firestore, 'eleicoes', id)
  const resultRef = doc(firestore, 'eleicoes', id, 'resultados', 'consolidado')
  const historyRef = doc(collection(firestore, 'eleicoes', id, 'historicoAdministrativo'))
  const closureRef = doc(firestore, 'eleicoes', id, 'historicoAdministrativo', 'closed-auto')
  const election = await getDoc(electionRef)
  if (!election.exists()) throw new ResultPublicationError('NOT_FOUND', 'Eleição não encontrada.')
  const data = election.data()
  if (!canPublishResults(data.status, data.startsAt, data.endsAt)) {
    throw new ResultPublicationError('NOT_CLOSED', 'A votação ainda não foi encerrada.')
  }
  if (data.publishedAllow === true || data.resultsPublishedAt) {
    throw new ResultPublicationError('ALREADY_PUBLISHED', 'O resultado já foi publicado.')
  }

  const inputs = await loadPreviewInputs(id, data)
  const result = calculateResult(id, inputs.data, inputs.candidates)
  return runTransaction(firestore, async (transaction) => {
    const current = await transaction.get(electionRef)
    const existing = await transaction.get(resultRef)
    const closure = await transaction.get(closureRef)
    if (!current.exists()) throw new ResultPublicationError('NOT_FOUND', 'Eleição não encontrada.')
    const currentData = current.data()
    if (!canPublishResults(currentData.status, currentData.startsAt, currentData.endsAt)) {
      throw new ResultPublicationError('NOT_CLOSED', 'A votação ainda não foi encerrada.')
    }
    if (currentData.publishedAllow === true || currentData.resultsPublishedAt || existing.exists()) {
      throw new ResultPublicationError('ALREADY_PUBLISHED', 'O resultado já foi publicado.')
    }

    const publishedAt = new Date().toISOString()
    const published = { ...result, publishedAt }
    transaction.set(resultRef, published)
    if (!closure.exists()) {
      const endsAt = asElectionDate(currentData.endsAt)
      if (endsAt) transaction.set(closureRef, { action: 'closed', actor: 'Sistema', occurredAt: Timestamp.fromDate(endsAt) })
    }
    transaction.set(historyRef, { action: 'published', actor, occurredAt: Timestamp.fromDate(new Date(publishedAt)) })
    transaction.update(electionRef, {
      status: 'closed',
      publishedAllow: true,
      resultsPublishedAt: Timestamp.fromDate(new Date(publishedAt)),
    })
    return published
  })
}

export async function listPublishedResults(): Promise<Array<{ id: string, title: string, type: ElectionType, publishedAt: string | null }>> {
  const snapshot = await getDocs(collection(firestore, 'eleicoes'))
  return snapshot.docs.flatMap((document) => {
    const data = document.data()
    if (!isPublished(data)) return []
    try {
      return [{
        id: document.id,
        title: typeof data.title === 'string' ? data.title : 'Eleição sem título',
        type: electionType(data.type),
        publishedAt: asElectionDate(data.resultsPublishedAt)?.toISOString() ?? null,
      }]
    }
    catch {
      return []
    }
  }).sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
}

export async function getPublishedResult(id: string): Promise<ElectionResult | null> {
  const election = await getDoc(doc(firestore, 'eleicoes', id))
  if (!election.exists() || !isPublished(election.data())) return null
  return publishedResult(id, election.data())
}
