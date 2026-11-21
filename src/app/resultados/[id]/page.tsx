import Link from 'next/link'
import { notFound } from 'next/navigation'
import ElectionResults from '@/components/ElectionResults/ElectionResults'
import { getPublishedResult } from '@/lib/election-results'

export const dynamic = 'force-dynamic'

export default async function PublishedResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let result
  try {
    result = await getPublishedResult(id)
  }
  catch (error) {
    console.error('Erro ao consultar resultado público:', error)
    return <main className="signup-candidate-page"><p role="alert">Não foi possível carregar o resultado.</p></main>
  }
  if (!result) notFound()
  const firstRoundResult = result.originalElectionId
    ? await getPublishedResult(result.originalElectionId)
    : null

  return (
    <main className="signup-candidate-page">
      <div className="signup-candidate-header">
        <Link href="/resultados">Voltar aos resultados</Link>
        <h1>{result.title}</h1>
        {result.originalElectionId && firstRoundResult && (
          <p><Link href={`/resultados/${encodeURIComponent(result.originalElectionId)}`}>Ver resultado do primeiro turno</Link></p>
        )}
        <ElectionResults result={result} />
      </div>
    </main>
  )
}
