import Link from 'next/link'
import { collection, getDocs, Timestamp } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import { ELECTION_COLLECTION } from '@/lib/constants/firebase'
import { ElectionStatus } from '@/interfaces/firebaseInterfaces'
import { ElectionType } from '@/lib/constants/election'
import styles from './page.module.css'

type DisplayStatus = ElectionStatus | 'unknown'

type ElectionSummary = {
  id: string
  title: string
  description: string
  type: string
  status: DisplayStatus
  startsAt: Date | null
  endsAt: Date | null
  createdAt: Date | null
}

const typeLabels: Record<ElectionType, string> = {
  'president': 'Presidencial',
  'deputy': 'Deputado federal',
  'public-consultation': 'Consulta pública',
}

const statusLabels: Record<DisplayStatus, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  open: 'Em andamento',
  closed: 'Encerrada',
  cancelled: 'Cancelada',
  unknown: 'Status não informado',
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })
const dayFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function readDate(value: unknown): Date | null {
  const date = value instanceof Timestamp
    ? value.toDate()
    : value instanceof Date
      ? value
      : typeof value === 'string'
        ? new Date(value)
        : null

  return date && !Number.isNaN(date.getTime()) ? date : null
}

function displayStatus(status: unknown, startsAt: Date | null, endsAt: Date | null, today: string): DisplayStatus {
  if (status === 'draft' || status === 'cancelled' || status === 'closed') return status
  if (endsAt && dayFormatter.format(endsAt) < today) return 'closed'
  if (startsAt && dayFormatter.format(startsAt) > today) return 'scheduled'
  if (startsAt && dayFormatter.format(startsAt) <= today) return 'open'
  if (status === 'scheduled' || status === 'open') return status
  return 'unknown'
}

function formatDate(date: Date | null): string {
  return date ? dateFormatter.format(date) : 'Não informada'
}

function ElectionSection({ title, elections, emptyMessage }: {
  title: string
  elections: ElectionSummary[]
  emptyMessage: string
}) {
  return (
    <section className={styles.section}>
      <h2>{`${title} (${elections.length})`}</h2>
      {elections.length === 0
        ? <p className={styles.empty}>{emptyMessage}</p>
        : (
            <ul className={styles.list}>
              {elections.map(election => (
                <li className={styles.card} key={election.id}>
                  <div className={styles.cardHeader}>
                    <h3>{election.title}</h3>
                    <span className={styles.status}>{statusLabels[election.status]}</span>
                  </div>
                  <p className={styles.type}>{typeLabels[election.type as ElectionType] ?? 'Tipo não informado'}</p>
                  {election.description && <p className={styles.description}>{election.description}</p>}
                  <dl className={styles.dates}>
                    <div>
                      <dt>Início</dt>
                      <dd>{formatDate(election.startsAt)}</dd>
                    </div>
                    <div>
                      <dt>Término</dt>
                      <dd>{formatDate(election.endsAt)}</dd>
                    </div>
                  </dl>
                  {election.status === 'draft' && (
                    <Link className={styles.editLink} href={`/eleicao/${election.id}/editar`}>Editar rascunho</Link>
                  )}
                </li>
              ))}
            </ul>
          )}
    </section>
  )
}

export default async function ElectionsPage() {
  const today = dayFormatter.format(new Date())
  let elections: ElectionSummary[]

  try {
    const snapshot = await getDocs(collection(firestore, ELECTION_COLLECTION))
    elections = snapshot.docs.map((document) => {
      const data = document.data()
      const startsAt = readDate(data.startsAt)
      const endsAt = readDate(data.endsAt)

      return {
        id: document.id,
        title: typeof data.title === 'string' && data.title.trim() ? data.title : 'Eleição sem título',
        description: typeof data.description === 'string' ? data.description : '',
        type: typeof data.type === 'string' ? data.type : '',
        status: displayStatus(data.status, startsAt, endsAt, today),
        startsAt,
        endsAt,
        createdAt: readDate(data.createdAt),
      }
    })
  }
  catch (error) {
    console.error('Erro ao carregar eleições:', error)
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <Link href="/admin" className={styles.backLink}>Voltar ao menu</Link>
          <h1>Eleições</h1>
          <p role="alert">Não foi possível carregar as eleições. Tente novamente.</p>
        </div>
      </main>
    )
  }

  elections.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
  const created = elections.filter(election => election.status !== 'closed')
  const closed = elections.filter(election => election.status === 'closed')

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <Link href="/admin" className={styles.backLink}>Voltar ao menu</Link>
          <Link href="/eleicao/criar" className="primary-btn">Criar eleição</Link>
        </div>
        <h1>Eleições</h1>
        <ElectionSection title="Eleições criadas" elections={created} emptyMessage="Nenhuma eleição criada foi encontrada." />
        <ElectionSection title="Eleições encerradas" elections={closed} emptyMessage="Nenhuma eleição encerrada foi encontrada." />
      </div>
    </main>
  )
}
