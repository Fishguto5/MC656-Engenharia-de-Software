'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import type { SecondRoundSetup } from '@/lib/second-round'
import styles from './second-round.module.css'

export default function SecondRoundForm({ setup }: { setup: SecondRoundSetup }) {
  const router = useRouter()
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [selected, setSelected] = useState<string[]>(setup.candidates.map(candidate => candidate.id))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  function toggle(id: string) {
    setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const start = new Date(startsAt)
    const end = new Date(endsAt)
    if (selected.length !== 2) {
      setError('Selecione os dois candidatos habilitados.')
      return
    }
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start <= new Date()
      || start <= setup.firstRoundEndsAt || end <= start) {
      setError('Informe um período futuro, após o término do primeiro turno.')
      return
    }
    setPending(true)
    try {
      const response = await fetch(`/api/admin/elections/${encodeURIComponent(setup.originalId)}/second-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startsAt: start.toISOString(), endsAt: end.toISOString(), candidateIds: selected }),
      })
      const data = await response.json() as { id?: string, error?: string }
      if (!response.ok || !data.id) {
        setError(data.error ?? 'Não foi possível criar o segundo turno.')
        return
      }
      router.push(`/eleicao/${encodeURIComponent(data.id)}/relatorio`)
      router.refresh()
    }
    catch {
      setError('Não foi possível criar o segundo turno. Tente novamente.')
    }
    finally {
      setPending(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <p>Os dois candidatos mais votados na apuração estão habilitados para esta votação.</p>
      <fieldset>
        <legend>Candidatos habilitados</legend>
        {setup.candidates.map(candidate => (
          <label className={styles.candidate} key={candidate.id}>
            <input type="checkbox" checked={selected.includes(candidate.id)} onChange={() => toggle(candidate.id)} />
            <span>
              {candidate.nome}
              {' — nº '}
              {candidate.numero}
              {' ('}
              {candidate.votos}
              {' votos no primeiro turno)'}
            </span>
          </label>
        ))}
      </fieldset>
      <label className={styles.field}>
        Início da votação
        <input type="datetime-local" value={startsAt} onChange={event => setStartsAt(event.target.value)} required />
      </label>
      <label className={styles.field}>
        Fim da votação
        <input type="datetime-local" value={endsAt} onChange={event => setEndsAt(event.target.value)} min={startsAt || undefined} required />
      </label>
      {error && <p role="alert">{error}</p>}
      <button className="primary-btn" type="submit" disabled={pending || selected.length !== 2}>
        {pending ? 'Criando...' : 'Criar segundo turno'}
      </button>
    </form>
  )
}
