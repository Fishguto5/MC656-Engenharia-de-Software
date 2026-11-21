import Link from 'next/link'
import { listPublishedResults } from '@/lib/election-results'

export const dynamic = 'force-dynamic'

export default async function PublishedResultsPage() {
  let results
  try {
    results = await listPublishedResults()
  }
  catch (error) {
    console.error('Erro ao listar resultados:', error)
    return <main className="signup-candidate-page"><p role="alert">Não foi possível carregar os resultados.</p></main>
  }

  return (
    <main className="signup-candidate-page">
      <section className="candidate-list">
        <h1>Resultados publicados</h1>
        {results.length === 0 && <p>Nenhum resultado publicado até o momento.</p>}
        <ul>
          {results.map(result => (
            <li key={result.id}>
              <Link href={`/resultados/${result.id}`}>{result.title}</Link>
              {' — '}
              {result.publishedAt
                ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short' }).format(new Date(result.publishedAt))
                : 'Data de publicação não informada'}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
