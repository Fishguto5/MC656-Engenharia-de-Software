import Link from 'next/link'
import { notFound } from 'next/navigation'
import ElectionResults from '@/components/ElectionResults/ElectionResults'
import { getAdminElectionResult, ResultPublicationError } from '@/lib/election-results'
import PublishButton from './publish-button'

export default async function AdminResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let view
  try {
    view = await getAdminElectionResult(id)
  }
  catch (error) {
    if (error instanceof ResultPublicationError && error.code === 'NOT_FOUND') notFound()
    console.error('Erro ao consultar resultado:', error)
    const message = error instanceof ResultPublicationError
      ? error.message
      : error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied'
        ? 'O Firestore negou a leitura dos votos. Verifique as regras de acesso da coleção de eleições e candidatos.'
        : 'Não foi possível consultar o resultado. Verifique a conexão com o Firestore e tente novamente.'
    return <main className="signup-candidate-page"><p role="alert">{message}</p></main>
  }

  return (
    <main className="signup-candidate-page">
      <div className="signup-candidate-header">
        <Link href="/eleicao">Voltar às eleições</Link>
        <p><Link href={`/eleicao/${encodeURIComponent(id)}/relatorio`}>Relatório e histórico administrativo</Link></p>
        <h1>{view.title}</h1>
        {view.turno === 2 && view.originalElectionId && (
          <p><Link href={`/eleicao/${encodeURIComponent(view.originalElectionId)}/resultados`}>Ver apuração do primeiro turno</Link></p>
        )}
        {view.secondRoundElectionId && (
          <p><Link href={`/eleicao/${encodeURIComponent(view.secondRoundElectionId)}/resultados`}>Ver segundo turno</Link></p>
        )}
        {!view.result && <p>Os resultados ficam disponíveis após o horário de término da votação.</p>}
        {view.result && (
          <>
            <p>{view.published ? 'Resultado publicado' : 'Prévia da apuração para autorização'}</p>
            <ElectionResults result={view.result} />
            {view.turno === 1 && view.result.segundoTurno && !view.secondRoundElectionId && (
              <p><Link href={`/eleicao/${encodeURIComponent(id)}/segundo-turno`}>Criar votação de segundo turno</Link></p>
            )}
            {view.published
              ? <p><Link href={`/resultados/${encodeURIComponent(id)}`}>Ver resultado público</Link></p>
              : <PublishButton electionId={id} />}
          </>
        )}
      </div>
    </main>
  )
}
