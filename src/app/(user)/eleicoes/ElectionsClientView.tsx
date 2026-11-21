'use client'

import type { ElectionStatus } from '@/interfaces/firebaseInterfaces'
import { LISTA_UFS, type ElectionType, type UF, VALID_ELECTION_TYPE } from '@/lib/constants/election'
import { ELECTION_COLLECTION } from '@/lib/constants/firebase'
import { firestore } from '@/lib/firebase'
import { collection, doc, getDoc, getDocs, type DocumentData } from 'firebase/firestore'
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
  uf?: UF
  local?: UF | 'Brasil'
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

function isUf(value: unknown): value is UF {
  return LISTA_UFS.some(uf => uf === value)
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
    uf: isUf(data.uf) ? data.uf : undefined,
    local: data.local === 'Brasil' || isUf(data.local) ? data.local : undefined,
  }
}

function getStoredCpf(): string | null {
  try {
    const saved = JSON.parse(localStorage.getItem('auth:user') ?? 'null') as unknown
    if (!saved || typeof saved !== 'object' || !('cpf' in saved) || typeof saved.cpf !== 'string') return null
    const cpf = saved.cpf.replace(/\D/g, '')
    return cpf.length === 11 ? cpf : null
  }
  catch {
    return null
  }
}

async function getVoterUf(): Promise<{ identified: boolean, uf: UF | null }> {
  const cpf = getStoredCpf()
  if (!cpf) return { identified: false, uf: null }

  const voter = await getDoc(doc(firestore, 'users', cpf))
  if (!voter.exists() || voter.data().isAdmin === true) return { identified: false, uf: null }

  return { identified: true, uf: isUf(voter.data().uf) ? voter.data().uf : null }
}

function isEligible(election: ListedElection, identified: boolean, voterUf: UF | null): boolean {
  if (!identified) return false
  if (election.type === 'president') return true
  if (election.type === 'deputy') return voterUf !== null && election.uf === voterUf
  return election.local === 'Brasil' || (voterUf !== null && election.local === voterUf)
}

function formatDate(date: Date | null): string | null {
  return date?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) ?? null
}

export default function ElectionsClientView() {
  const [elections, setElections] = useState<ListedElection[]>([])
  const [voter, setVoter] = useState<{ identified: boolean, uf: UF | null }>({ identified: false, uf: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true

    async function loadElections() {
      try {
        const [electionsSnapshot, voterData] = await Promise.all([
          getDocs(collection(firestore, ELECTION_COLLECTION)),
          getVoterUf().catch(() => ({ identified: false, uf: null })),
        ])

        if (!active) return
        setElections(electionsSnapshot.docs
          .map(snapshot => toListedElection(snapshot.id, snapshot.data()))
          .filter((election): election is ListedElection => election !== null))
        setVoter(voterData)
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
    const aEligible = isEligible(a, voter.identified, voter.uf) && a.status === 'open'
    const bEligible = isEligible(b, voter.identified, voter.uf) && b.status === 'open'
    if (aEligible !== bEligible) return aEligible ? -1 : 1
    return statusOrder[a.status] - statusOrder[b.status]
      || (a.startsAt?.getTime() ?? 0) - (b.startsAt?.getTime() ?? 0)
  })
  const readyToVote = sortedElections.filter(election => election.status === 'open' && isEligible(election, voter.identified, voter.uf)).length

  return (
    <main className="signup-candidate-page">
      <section className="candidate-list">
        <header>
          <h1>Lista de Eleições</h1>
          <p className={styles.intro}>Veja o tipo e o status de cada votação. As eleições abertas para você aparecem primeiro.</p>
        </header>

        {!loading && !error && voter.identified && (
          <div className={styles.summary} role="status">
            <span className={styles.summaryCount}>{readyToVote}</span>
            <span>{readyToVote === 1 ? 'votação disponível para você agora' : 'votações disponíveis para você agora'}</span>
          </div>
        )}

        {!loading && !error && !voter.identified && (
          <p className={styles.notice}>Identifique-se como eleitor para consultar sua aptidão e acessar as votações.</p>
        )}

        {!loading && !error && voter.identified && !voter.uf && (
          <p className={styles.notice}>Sua UF não está cadastrada. A aptidão para votações estaduais não pode ser confirmada.</p>
        )}

        {loading && <p className={styles.stateMessage} role="status">Carregando eleições...</p>}
        {error && <p className={styles.stateMessage} role="alert">Não foi possível carregar as eleições. Tente novamente mais tarde.</p>}
        {!loading && !error && elections.length === 0 && <p className={styles.stateMessage}>Nenhuma eleição disponível no momento.</p>}

        {!loading && !error && sortedElections.length > 0 && (
          <section aria-label="Lista de eleições" className={styles.list}>
            {sortedElections.map((election) => {
              const eligible = isEligible(election, voter.identified, voter.uf)
              const canVote = eligible && election.status === 'open'
              const shouldHighlight = eligible && (election.status === 'open' || election.status === 'scheduled')
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
                    {!canVote && eligible && election.status === 'scheduled' && <span className={styles.eligibleLabel}>Você está apto</span>}
                  </div>
                </>
              )

              return canVote
                ? <Link key={election.id} href={`/votar/${election.id}`} className={`${styles.card} ${styles.highlight}`}>{content}</Link>
                : <article key={election.id} className={`${styles.card} ${shouldHighlight ? styles.highlight : ''}`}>{content}</article>
            })}
          </section>
        )}
      </section>
    </main>
  )
}
