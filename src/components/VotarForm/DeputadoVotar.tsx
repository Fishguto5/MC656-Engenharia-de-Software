import { EleicaoDeputado } from '@/interfaces/eleicaoInterfaces'
import { ChangeEvent, useState } from 'react'
import styles from './votarForm.module.css'

interface Props {
  election: EleicaoDeputado
  onSubmit: (payload: { type: 'deputy', candidateNumber: number }) => Promise<void>
}

export function DeputadoVotarForm({ election, onSubmit }: Props) {
  const [nummber, setNumer] = useState<number | undefined>(0)

  function formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0') // Mês começa em 0
    const year = date.getFullYear()

    return `${day}/${month}/${year}`
  }

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault()
    if (nummber === undefined) return
    console.log(nummber)
    onSubmit({ type: 'deputy', candidateNumber: nummber })
  }

  const handleFieldChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNumer(parseInt(e.target.value))
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
          value={nummber}
          onChange={handleFieldChange}
          min={0}
        />
      </fieldset>

      <div className="VotarForm-btn-container">
        <button type="reset" className="primary-btn cancel-btn">Cancelar</button>
        <button type="submit" className="primary-btn confirm-btn">Confirmar</button>
      </div>
    </form>
  )
}
