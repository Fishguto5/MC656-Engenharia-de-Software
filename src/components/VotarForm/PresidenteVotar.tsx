import { EleicaoPresidente } from '@/interfaces/eleicaoInterfaces'
import { ChangeEvent, useState } from 'react'
import styles from './votarForm.module.css'

interface Props {
  election: EleicaoPresidente
  onSubmit: (payload: { type: 'president', candidateNumber: number }) => Promise<void>
}

export function PresidenteVotarForm({ election, onSubmit }: Props) {
  const [number, setNumber] = useState<number | undefined>(0)
  const candidato = election.candidatos.filter((cand) => cand.numero === number)

  function formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0') // Mês começa em 0
    const year = date.getFullYear()

    return `${day}/${month}/${year}`
  }

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault()
    if (number === undefined) return
    console.log(number)
    onSubmit({ type: 'president', candidateNumber: number })
  }

  const handleFieldChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNumber(parseInt(e.target.value))
  }

  return (
    <form onSubmit={handleSubmit} className="votar-form">
      <div className="VotarForm-title-container">
        <h1 className="no-margin">{election.title}</h1>
        <div className="w-full flex flex-row justify-end items-center">
          <p>
            disponível até:
            {formatDate(election.endsAt)}
          </p>
        </div>

        <p>
          <span className="font-bold">Dispõe sobre</span>
          {' '}
          {election.description}
        </p>
      </div>

      <fieldset className={`form-field ${styles.formField}`}>
        <label htmlFor="president">Número do Candidato</label>
        <input
          type="number"
          name="president"
          id="president"
          value={number}
          onChange={handleFieldChange}
          min={0}
        />
      </fieldset>

      {(candidato.length > 0) && (
        <div className={styles.card}>
          <h2 className={styles.nome}>{candidato[0].nome}</h2>
          <p className={styles.badge}>
            {candidato[0].partido}
          </p>
        </div>
      )}

      <div className="VotarForm-btn-container">
        <button type="reset" className="primary-btn cancel-btn">Cancelar</button>
        <button type="submit" className="primary-btn confirm-btn">Confirmar</button>
      </div>
    </form>
  )
}
