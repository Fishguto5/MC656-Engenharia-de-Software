'use client'

import type { ElectionStatus } from '@/interfaces/firebaseInterfaces'
import { type ElectionType, VALID_ELECTION_TYPE } from '@/lib/constants/election'
import { ELECTION_COLLECTION } from '@/lib/constants/firebase'
import { firestore } from '@/lib/firebase'
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
  status: Exclude<ElectionStatus, 'draft'>
  startsAt: Date | null
  endsAt: Date | null
}

const statusLabels: Record<ListedElection['status'], string> = {
  open: 'Em andamento',
  scheduled: 'Agendada',
  closed: 'Encerrada',
  cancelled: 'Cancelada',
}

const typeLabels: Record<ElectionType, string> = {
  president: 'Presidência',
  deputy: 'Deputado federal',
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

  return {
    id,
    title: data.title,
    description: typeof data.description === 'string' ? data.description : '',
    type: data.type as ElectionType,
    status: data.status as ListedElection['status'],
    startsAt: readDate(data.startsAt),
    endsAt: readDate(data.endsAt),
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

  useEffect(() => {
    let active = true
    const voterSession = readVoterSession()

    async function loadElections() {
      try {
        const electionsSnapshot = await getDocs(collection(firestore, ELECTION_COLLECTION))

        if (!active) return
        setElections(electionsSnapshot.docs
          .map(snapshot => toListedElection(snapshot.id, snapshot.data()))
          .filter((election): election is ListedElection => election !== null))
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
    return () => { active = false }
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
            <p>Informe seu CPF e nome para acessar as votações abertas.</p>
            <Link href="/sign-up">Ir para identificação</Link>
          </div>
        )}

        {loading && <p className={styles.stateMessage} role="status">Carregando eleições...</p>}
        {error && <p className={styles.stateMessage} role="alert">Não foi possível carregar as eleições. Tente novamente mais tarde.</p>}
        {!loading && !error && elections.length === 0 && <p className={styles.stateMessage}>Nenhuma eleição disponível no momento.</p>}

        {!loading && !error && sortedElections.length > 0 && (
          <section aria-label="Lista de eleições" className={styles.list}>
            {sortedElections.map((election) => {
              const canVote = voter !== null && election.status === 'open'
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
                    {canVote && <span className={styles.action}>Votar <span aria-hidden="true">→</span></span>}
                  </div>
                </>
              )

              return canVote
                ? <Link key={election.id} href={`/votar/${election.id}`} className={`${styles.card} ${styles.highlight}`} aria-label={`Votar em ${election.title}`}>{content}</Link>
                : <article key={election.id} className={styles.card}>{content}</article>
            })}
          </section>
        )}
      </section>
    </main>
  )
}
