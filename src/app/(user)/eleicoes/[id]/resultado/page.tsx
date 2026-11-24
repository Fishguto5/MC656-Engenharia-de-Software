'use client'

import { ELECTION_COLLECTION } from '@/lib/constants/firebase'
import { firestore } from '@/lib/firebase'
import { loadPublishedElectionResult, type PublishedElectionResult } from '@/lib/publishedElectionResult'
import { doc, getDoc } from 'firebase/firestore'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from './result.module.css'

const typeLabels = {
  'president': 'Eleição presidencial',
  'deputy': 'Eleição para deputado federal',
  'public-consultation': 'Consulta pública',
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
})

export default function ElectionResultPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''
  const [result, setResult] = useState<PublishedElectionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true

    async function loadResult() {
      try {
        if (!id) return
        const election = await getDoc(doc(firestore, ELECTION_COLLECTION, id))
        const published = election.exists() ? await loadPublishedElectionResult(id, election.data()) : null
        if (active) setResult(published)
      }
      catch (cause) {
        console.error('Erro ao carregar resultado:', cause)
        if (active) setError(true)
      }
      finally {
        if (active) setLoading(false)
      }
    }

    void loadResult()
    return () => {
      active = false
    }
  }, [id])

  return (
    <main className="signup-candidate-page">
      <section className={`${styles.container} candidate-list`}>
        <Link href="/eleicoes" className={styles.back}>← Voltar para eleições</Link>
        {loading && <p role="status">Carregando resultado...</p>}
        {!loading && error && <p role="alert">Não foi possível consultar o resultado. Tente novamente.</p>}
        {!loading && !error && !result && <p role="status">Resultado ainda não publicado para esta eleição.</p>}
        {!loading && !error && result && (
          <>
            <header className={styles.header}>
              <p className={styles.eyebrow}>
                {typeLabels[result.type]}
                {result.type === 'president' && ` · ${result.turno === 2 ? '2º turno' : '1º turno'}`}
              </p>
              <h1>{result.title}</h1>
              <p>
                Votação encerrada em
                {' '}
                {dateFormatter.format(result.endsAt)}
              </p>
              <p>
                Resultado publicado em
                {' '}
                {dateFormatter.format(result.publishedAt)}
              </p>
            </header>

            <dl className={styles.totals}>
              <div>
                <dt>Total de votos</dt>
                <dd>{result.totalVotos.toLocaleString('pt-BR')}</dd>
              </div>
              <div>
                <dt>Votos válidos</dt>
                <dd>{result.votosValidos.toLocaleString('pt-BR')}</dd>
              </div>
              {result.type !== 'public-consultation' && (
                <>
                  <div>
                    <dt>Brancos</dt>
                    <dd>{result.votosBrancos.toLocaleString('pt-BR')}</dd>
                  </div>
                  <div>
                    <dt>Nulos</dt>
                    <dd>{result.votosNulos.toLocaleString('pt-BR')}</dd>
                  </div>
                </>
              )}
              {result.type === 'deputy' && (
                <>
                  <div>
                    <dt>Votos de legenda</dt>
                    <dd>{result.votosLegenda.toLocaleString('pt-BR')}</dd>
                  </div>
                  <div>
                    <dt>Quociente eleitoral</dt>
                    <dd>{result.quocienteEleitoral?.toLocaleString('pt-BR') ?? 'Não informado'}</dd>
                  </div>
                </>
              )}
            </dl>

            {result.consulta && (
              <section className={styles.section}>
                <h2>Respostas</h2>
                <ul className={styles.rows}>
                  <li>
                    <span>Sim</span>
                    <strong>{result.consulta.sim.toLocaleString('pt-BR')}</strong>
                  </li>
                  <li>
                    <span>Não</span>
                    <strong>{result.consulta.nao.toLocaleString('pt-BR')}</strong>
                  </li>
                </ul>
              </section>
            )}

            {result.type !== 'public-consultation' && (
              <section className={styles.section}>
                <h2>Votação por candidato</h2>
                {result.candidatos.length === 0
                  ? <p>Nenhum candidato registrado.</p>
                  : (
                      <ol className={styles.rows}>
                        {result.candidatos.map(candidate => (
                          <li key={candidate.id}>
                            <span>
                              {candidate.nome}
                              {' '}
                              (
                              {candidate.partido}
                              , nº
                              {' '}
                              {candidate.numero}
                              )
                              {candidate.eleito && <strong> · Eleito</strong>}
                            </span>
                            <strong>{candidate.votos.toLocaleString('pt-BR')}</strong>
                          </li>
                        ))}
                      </ol>
                    )}
                {result.segundoTurno && <p>É necessário segundo turno para definir a presidência.</p>}
              </section>
            )}

            {result.type === 'deputy' && result.agremiacoes.length > 0 && (
              <section className={styles.section}>
                <h2>Agremiações</h2>
                <ul className={styles.rows}>
                  {result.agremiacoes.map(item => (
                    <li key={item.nome}>
                      <span>{item.nome}</span>
                      <strong>
                        {item.votosValidos.toLocaleString('pt-BR')}
                        {' '}
                        votos válidos ·
                        {' '}
                        {item.vagas}
                        {' '}
                        vagas
                      </strong>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  )
}
