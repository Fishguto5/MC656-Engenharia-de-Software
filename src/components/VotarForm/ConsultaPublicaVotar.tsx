import { ConsultaPublica } from '@/interfaces/eleicaoInterfaces'
import { useState } from 'react'

interface Props {
  election: ConsultaPublica
  onSubmit: (payload: { type: 'public-consultation', proposalApproved: boolean }) => Promise<void>
}

export function ConsultaPublicaVotarForm({ election, onSubmit }: Props) {
  const [choice, setChoice] = useState<boolean | null>(null)

  function formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0') // Mês começa em 0
    const year = date.getFullYear()

    return `${day}/${month}/${year}`
  }

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault()
    if (choice === null) return
    console.log(choice)
    onSubmit({ type: 'public-consultation', proposalApproved: choice })
  }

  return (
    <form onSubmit={handleSubmit} className="votar-form">
      <div className="VotarForm-title-container">
        <h1 className="no-margin">{election.title}</h1>
        <div className="w-full flex flex-row justify-between items-center">
          <p className="local">
            📌
            {election.local}
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

      <fieldset className="form-field-radix">
        <div className="form-option">
          <input type="radio" name="proposalApproved" id="approved" onChange={() => setChoice(true)} />
          <label htmlFor="approved">Apoio</label>
        </div>

        <hr className="radix-hr" />

        <div className="form-option">
          <input type="radio" name="proposalApproved" id="disapproved" onChange={() => setChoice(false)} />
          <label htmlFor="disapproved">Não Apoio</label>
        </div>
      </fieldset>

      <div className="VotarForm-btn-container">
        <button type="reset" className="primary-btn cancel-btn">Cancelar</button>
        <button type="submit" className="primary-btn confirm-btn" disabled={choice === null}>Confirmar</button>
      </div>
    </form>
  )
}
