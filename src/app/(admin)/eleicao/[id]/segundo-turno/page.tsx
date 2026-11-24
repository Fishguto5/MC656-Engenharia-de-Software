import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSecondRoundSetup, SecondRoundError } from '@/lib/second-round'
import SecondRoundForm from './second-round-form'
import styles from './second-round.module.css'

export default async function SecondRoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let setup
  let message: string | null = null
  try {
    setup = await getSecondRoundSetup(id)
  }
  catch (error) {
    if (error instanceof SecondRoundError && error.code === 'NOT_FOUND') notFound()
    if (!(error instanceof SecondRoundError)) throw error
    message = error.message
  }

  if (!setup) {
    return (
      <main className={styles.page}>
        <Link href={`/eleicao/${encodeURIComponent(id)}/resultados`}>Voltar à apuração</Link>
        <h1>Segundo turno indisponível</h1>
        <p role="alert">{message}</p>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <Link href={`/eleicao/${encodeURIComponent(id)}/resultados`}>Voltar à apuração do primeiro turno</Link>
      <h1>Criar segundo turno</h1>
      <p>
        Eleição original:
        {' '}
        <strong>{setup.title}</strong>
      </p>
      {setup.existingId
        ? (
            <p>
              O segundo turno já foi criado.
              {' '}
              <Link href={`/eleicao/${encodeURIComponent(setup.existingId)}/relatorio`}>Abrir votação</Link>
            </p>
          )
        : <SecondRoundForm setup={setup} />}
    </main>
  )
}
