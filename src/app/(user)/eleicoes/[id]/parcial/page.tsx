'use client'

import { ELECTION_COLLECTION } from '@/lib/constants/firebase'
import { isElectionAvailableForUf, isUf } from '@/lib/electionEligibility'
import { firestore } from '@/lib/firebase'
import { parsePartialConsultationResult } from '@/lib/partialConsultationResult'
import { readVoterSession } from '@/lib/voterSession'
import { doc, onSnapshot, type DocumentData } from 'firebase/firestore'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from '../resultado/result.module.css'

export default function PartialConsultationPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''
  const [data, setData] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const voter = typeof window === 'undefined' ? null : readVoterSession()

  useEffect(() => {
    if (!id || !readVoterSession()) {
      const timer = setTimeout(() => setLoading(false), 0)
      return () => clearTimeout(timer)
    }

    const unsubscribe = onSnapshot(doc(firestore, ELECTION_COLLECTION, id), (snapshot) => {
      setData(snapshot.exists() ? snapshot.data() : null)
      setError(false)
      setLoading(false)
      setNow(Date.now())
    }, (cause) => {
      console.error('Erro ao acompanhar resultado parcial:', cause)
      setData(null)
      setError(true)
      setLoading(false)
    })
    const interval = setInterval(() => setNow(Date.now()), 15000)
    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [id])

  const result = data && voter && data.local && (data.local === 'Brasil' || isUf(data.local))
    && isElectionAvailableForUf({ type: 'public-consultation', local: data.local }, voter.uf)
    ? parsePartialConsultationResult(data, new Date(now))
    : null

  return (
    <main className="signup-candidate-page">
      <section className={`${styles.container} candidate-list`}>
        <Link href="/eleicoes" className={styles.back}>← Voltar para eleições</Link>
        {loading && <p role="status">Carregando resultado parcial...</p>}
        {!loading && error && <p role="alert">Não foi possível acompanhar o resultado parcial. Tente novamente.</p>}
        {!loading && !error && !voter && <p role="status">Identifique-se para acompanhar esta consulta pública.</p>}
        {!loading && !error && voter && !result && <p role="status">Resultado parcial indisponível para esta consulta.</p>}
        {!loading && !error && result && (
          <>
            <header className={styles.header}>
              <p className={styles.eyebrow}>Consulta pública · Resultado parcial</p>
              <h1>{result.title}</h1>
              <p>
                Local:
                {' '}
                {result.local}
              </p>
              <p>Atualização automática durante a votação.</p>
            </header>
            <dl className={styles.totals}>
              <div>
                <dt>Total de votos computados</dt>
                <dd>{(result.sim + result.nao).toLocaleString('pt-BR')}</dd>
              </div>
            </dl>
            <section className={styles.section} aria-label="Votos por opção">
              <h2>Respostas até agora</h2>
              <ul className={styles.rows}>
                <li>
                  <span>Sim</span>
                  <strong>{result.sim.toLocaleString('pt-BR')}</strong>
                </li>
                <li>
                  <span>Não</span>
                  <strong>{result.nao.toLocaleString('pt-BR')}</strong>
                </li>
              </ul>
            </section>
            <p>Os números são agregados e não identificam os participantes.</p>
          </>
        )}
      </section>
    </main>
  )
}
