import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auditActionLabels, getElectionReport } from '@/lib/election-audit'
import styles from './report.module.css'

const formatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'medium',
})

const types: Record<string, string> = {
  'president': 'Presidencial',
  'deputy': 'Deputado federal',
  'public-consultation': 'Consulta pública',
}

const phases: Record<string, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  open: 'Em andamento',
  closed: 'Encerrada',
  cancelled: 'Cancelada',
  unknown: 'Status não informado',
}

function date(value: Date | null): string {
  return value ? formatter.format(value) : 'Não informada'
}

export default async function ElectionReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const report = await getElectionReport(id)
  if (!report) notFound()

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/eleicao">Voltar às eleições</Link>
        {report.phase === 'closed' && <Link href={`/eleicao/${encodeURIComponent(id)}/resultados`}>Consultar resultados</Link>}
      </nav>
      <h1>Relatório da eleição</h1>
      <h2>{report.title}</h2>
      <dl className={styles.details}>
        <div>
          <dt>ID</dt>
          <dd>{id}</dd>
        </div>
        <div>
          <dt>Tipo</dt>
          <dd>{types[report.type] ?? 'Não informado'}</dd>
        </div>
        <div>
          <dt>Situação</dt>
          <dd>{phases[report.phase]}</dd>
        </div>
        <div>
          <dt>Início</dt>
          <dd>{date(report.startsAt)}</dd>
        </div>
        <div>
          <dt>Término</dt>
          <dd>{date(report.endsAt)}</dd>
        </div>
        <div>
          <dt>Resultados</dt>
          <dd>{report.published ? 'Publicados' : 'Não publicados'}</dd>
        </div>
        {report.type === 'president' && (
          <div>
            <dt>Turno</dt>
            <dd>{report.turno === 2 ? 'Segundo' : 'Primeiro'}</dd>
          </div>
        )}
      </dl>
      {report.originalElectionId && (
        <p><Link href={`/eleicao/${encodeURIComponent(report.originalElectionId)}/relatorio`}>Relatório do primeiro turno</Link></p>
      )}
      {report.secondRoundElectionId && (
        <p><Link href={`/eleicao/${encodeURIComponent(report.secondRoundElectionId)}/relatorio`}>Relatório do segundo turno</Link></p>
      )}
      <section aria-labelledby="history-title">
        <h2 id="history-title">Histórico administrativo</h2>
        {report.history.length === 0
          ? <p>Nenhuma ação registrada para esta eleição.</p>
          : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Ação</th>
                    <th>Responsável</th>
                    <th>Data e horário</th>
                  </tr>
                </thead>
                <tbody>
                  {report.history.map(entry => (
                    <tr key={entry.id}>
                      <td>{auditActionLabels[entry.action]}</td>
                      <td>{entry.actor === 'Sistema' ? 'Sistema' : `Administrador (CPF ${entry.actor})`}</td>
                      <td><time dateTime={entry.occurredAt.toISOString()}>{date(entry.occurredAt)}</time></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
      </section>
    </main>
  )
}
