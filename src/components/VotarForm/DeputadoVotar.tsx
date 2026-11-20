import { EleicaoDeputado } from '@/interfaces/eleicaoInterfaces'
import { ChangeEvent, useState } from 'react'
import styles from './votarForm.module.css'

interface Props {
  election: EleicaoDeputado
  onSubmit: (payload: { type: 'deputy', candidateNumber: number }) => Promise<void>
}

export function DeputadoVotarForm({ election, onSubmit }: Props) {
  const [number, setNumber] = useState<number>(0)
  const candidato = election.candidatos.filter(cand => cand.numero === number)

  function formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0') // Mês começa em 0
    const year = date.getFullYear()

    return `${day}/${month}/${year}`
  }

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault()
    console.log(number)
    onSubmit({ type: 'deputy', candidateNumber: number })
  }

  const handleFieldChange = (e: ChangeEvent<HTMLInputElement>) => {
    const texto = e.target.value

    if (texto === '') {
      setNumber(0)
      return
    }

    const num = Number(texto)
    if (Number.isNaN(num)) {
      setNumber(0)
      return
    }
    setNumber(num < 0 ? -num : num)
  }

  return (
    <form onSubmit={handleSubmit} className="votar-form">
      <div className="VotarForm-title-container">
        <h1 className="no-margin">{election.title}</h1>
        <div className="w-full flex flex-row justify-between items-center">
          <p className="local">
            📌
            {election.uf}
          </p>
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
          value={number ?? 0}
          onChange={handleFieldChange}
          min={0}
        />
      </fieldset>

      <div className="flex w-full justify-center">
        {candidato.length > 0
          ? (
              <div className={styles.card}>
                <h2 className={styles.nome}>{candidato[0].nome}</h2>
                <p className={styles.badge}>
                  {candidato[0].federacao || candidato[0].partido}
                </p>
              </div>
            )
          : number === 0
            ? (
                <div className={styles.card}>
                  <h2 className={styles.nome}>Voto em Branco</h2>
                </div>
              )
            : number
              ? (
                  <div className={styles.card}>
                    <h2 className={styles.nome}>Voto Nulo</h2>
                  </div>
                )
              : null}
      </div>

      <div className="VotarForm-btn-container">
        <button type="reset" className="primary-btn cancel-btn">Cancelar</button>
        <button type="submit" className="primary-btn confirm-btn">Confirmar</button>
      </div>
    </form>
  )
}
