'use client'

import type { ElectionStatus } from '@/interfaces/firebaseInterfaces'
import { type ElectionType, type UF, VALID_ELECTION_TYPE } from '@/lib/constants/election'
import { isElectionAvailableForUf, isUf } from '@/lib/electionEligibility'
import { ELECTION_COLLECTION } from '@/lib/constants/firebase'
import { firestore } from '@/lib/firebase'
import { getElectionPhase } from '@/lib/election-timing'
import { loadPublishedElectionResult } from '@/lib/publishedElectionResult'
import { readVoterSession, type VoterSession } from '@/lib/voterSession'
import { collection, getDocs, type DocumentData } from 'firebase/firestore'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import styles from './ElectionsClientView.module.css'

type ListedElection = {
  id: string
  title: string
  description: string
  type: ElectionType
  uf?: UF
  local?: 'Brasil' | UF
  status: Exclude<ElectionStatus, 'draft'>
  startsAt: Date | null
  endsAt: Date | null
  partialResultsAllowed: boolean
}

const statusLabels: Record<ListedElection['status'], string> = {
  open: 'Em andamento',
  scheduled: 'Agendada',
  closed: 'Encerrada',
  cancelled: 'Cancelada',
}

const typeLabels: Record<ElectionType, string> = {
  'president': 'Presidência',
  'deputy': 'Deputado federal',
  'public-consultation': 'Consulta pública',
}

const statusOrder: Record<ListedElection['status'], number> = {
  open: 0,
  scheduled: 1,
  closed: 2,
  cancelled: 3,
}

function readDate(value: unknown): Date | null {
  if (!value || typeof value !== 'object' || !('toDate' in value) || typeof value.toDate !== 'function') return null
  const date = value.toDate() as unknown
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null
}

function toListedElection(id: string, data: DocumentData): ListedElection | null {
  if (
    typeof data.title !== 'string'
    || !VALID_ELECTION_TYPE.has(data.type)
    || !['open', 'scheduled', 'closed', 'cancelled'].includes(data.status)
  ) return null

  if (data.type === 'deputy' && !isUf(data.uf)) return null
  if (data.type === 'public-consultation' && data.local !== 'Brasil' && !isUf(data.local)) return null

  const status = getElectionPhase(data.status, data.startsAt, data.endsAt)
  if (status === 'draft' || status === 'unknown') return null

  return {
    id,
    title: data.title,
    description: typeof data.description === 'string' ? data.description : '',
    type: data.type as ElectionType,
    uf: isUf(data.uf) ? data.uf : undefined,
    local: data.local === 'Brasil' || isUf(data.local) ? data.local : undefined,
    status,
    startsAt: readDate(data.startsAt),
    endsAt: readDate(data.endsAt),
    partialResultsAllowed: data.type === 'public-consultation' && data.partialResultsAllowed === true,
  }
}

function formatDate(date: Date | null): string | null {
  return date?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) ?? null
}

export default function ElectionsClientView() {
  const [elections, setElections] = useState<ListedElection[]>([])
  const [voter, setVoter] = useState<VoterSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [resultAvailability, setResultAvailability] = useState<Record<string, 'published' | 'unpublished' | 'error'>>({})

  useEffect(() => {
    let active = true
    const voterSession = readVoterSession()

    async function loadElections() {
      try {
        const electionsSnapshot = await getDocs(collection(firestore, ELECTION_COLLECTION))

        if (!active) return
        const visibleSnapshots = electionsSnapshot.docs
          .map(snapshot => ({ snapshot, election: toListedElection(snapshot.id, snapshot.data()) }))
          .filter((item): item is { snapshot: typeof electionsSnapshot.docs[number], election: ListedElection } => item.election !== null)
          .filter(item => voterSession !== null && isElectionAvailableForUf(item.election, voterSession.uf))

        const availabilityEntries = await Promise.all(visibleSnapshots
          .filter(item => item.election.status === 'closed')
          .map(async ({ snapshot }) => {
            try {
              const result = await loadPublishedElectionResult(snapshot.id, snapshot.data())
              return [snapshot.id, result ? 'published' : 'unpublished'] as const
            }
            catch (cause) {
              console.error('Erro ao consultar resultado:', cause)
              return [snapshot.id, 'error'] as const
            }
          }))

        if (!active) return
        setResultAvailability(Object.fromEntries(availabilityEntries))
        setElections(visibleSnapshots.map(item => item.election))
        setVoter(voterSession)
      }
      catch (cause) {
        console.error('Erro ao carregar eleições:', cause)
        if (active) setError(true)
      }
      finally {
        if (active) setLoading(false)
      }
    }

    void loadElections()
    return () => {
      active = false
    }
  }, [])

  const sortedElections = [...elections].sort((a, b) => {
    return statusOrder[a.status] - statusOrder[b.status]
      || (a.startsAt?.getTime() ?? 0) - (b.startsAt?.getTime() ?? 0)
  })
  const readyToVote = voter ? sortedElections.filter(election => election.status === 'open').length : 0

  return (
    <main className="signup-candidate-page">
      <section className="candidate-list">
        <header>
          <h1>Lista de Eleições</h1>
          <p className={styles.intro}>Veja o tipo e o status de cada votação. As votações abertas aparecem primeiro.</p>
        </header>

        {!loading && !error && voter && (
          <div className={styles.summary} role="status">
            <span className={styles.summaryCount}>{readyToVote}</span>
            <span>{readyToVote === 1 ? 'votação disponível agora' : 'votações disponíveis agora'}</span>
          </div>
        )}

        {!loading && !error && !voter && (
          <div className={styles.notice}>
            <p>Informe seu CPF, nome e UF do domicílio eleitoral para acessar as votações.</p>
            <Link href="/sign-up">Ir para identificação</Link>
          </div>
        )}

        {loading && <p className={styles.stateMessage} role="status">Carregando eleições...</p>}
        {error && <p className={styles.stateMessage} role="alert">Não foi possível carregar as eleições. Tente novamente mais tarde.</p>}
        {!loading && !error && voter && elections.length === 0 && <p className={styles.stateMessage}>Nenhuma eleição disponível no momento.</p>}

        {!loading && !error && sortedElections.length > 0 && (
          <section aria-label="Lista de eleições" className={styles.list}>
            {sortedElections.map((election) => {
              const canVote = voter !== null && election.status === 'open'
              const canViewResult = election.status === 'closed' && resultAvailability[election.id] === 'published'
              const canViewPartial = canVote && election.type === 'public-consultation' && election.partialResultsAllowed
              const startsAt = formatDate(election.startsAt)
              const endsAt = formatDate(election.endsAt)

              const content = (
                <>
                  <div className={styles.cardTop}>
                    <span className={styles.type}>{typeLabels[election.type]}</span>
                    <span className={`${styles.status} ${styles[election.status]}`}>
                      <span className={styles.statusDot} aria-hidden="true" />
                      {statusLabels[election.status]}
                    </span>
                  </div>
                  <h2>{election.title}</h2>
                  {election.description && <p className={styles.description}>{election.description}</p>}
                  <div className={styles.cardBottom}>
                    <span className={styles.dates}>
                      {startsAt && endsAt ? `${startsAt} a ${endsAt}` : startsAt ?? endsAt ?? 'Período não informado'}
                    </span>
                    {canVote && (
                      <span className={styles.action}>
                        Votar
                        <span aria-hidden="true">→</span>
                      </span>
                    )}
                    {canViewResult && (
                      <span className={styles.action}>
                        Ver resultado
                        <span aria-hidden="true">→</span>
                      </span>
                    )}
                    {election.status === 'closed' && !canViewResult && (
                      <span className={styles.resultMessage}>
                        {resultAvailability[election.id] === 'error' ? 'Não foi possível consultar o resultado' : 'Resultado ainda não publicado'}
                      </span>
                    )}
                  </div>
                </>
              )

              return canViewPartial
                ? (
                    <div key={election.id} className={styles.cardGroup}>
                      <Link href={`/votar/${encodeURIComponent(election.id)}`} className={`${styles.card} ${styles.highlight}`} aria-label={`Votar em ${election.title}`}>{content}</Link>
                      <Link href={`/eleicoes/${encodeURIComponent(election.id)}/parcial`} className={styles.partialLink}>
                        Acompanhar resultado parcial →
                      </Link>
                    </div>
                  )
                : canVote
                  ? <Link key={election.id} href={`/votar/${election.id}`} className={`${styles.card} ${styles.highlight}`} aria-label={`Votar em ${election.title}`}>{content}</Link>
                  : canViewResult
                    ? <Link key={election.id} href={`/eleicoes/${encodeURIComponent(election.id)}/resultado`} className={styles.card} aria-label={`Ver resultado de ${election.title}`}>{content}</Link>
                    : <article key={election.id} className={styles.card}>{content}</article>
            })}
          </section>
        )}
      </section>
    </main>
  )
}
