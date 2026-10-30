import { ChangeEvent } from 'react'
import './CandidatoForm.css'
import { getMaxDate } from '@/lib/repository/firebaseCandidatesRepository'

interface CandidatoFormProps {
  name: string
  party: string
  federation: string
  DoB: string
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (e: React.SubmitEvent) => Promise<void>
}

export default function CandidatoForm(props: CandidatoFormProps) {
  return (
    <form method="POST" action="#" className="signup-form" onSubmit={props.handleSubmit}>
      <div className="form-field">
        <label htmlFor="name">Nome</label>
        <input
          type="text"
          name="name"
          id="name"
          autoComplete="name"
          required
          value={props.name}
          onChange={props.handleChange}
        />
      </div>

      <div className="form-field">
        <label htmlFor="party">Partido</label>
        <input
          type="text"
          name="party"
          id="party"
          required
          value={props.party}
          onChange={props.handleChange}
        />
      </div>

      <div className="form-field">
        <label htmlFor="federation">Federação (Opicional)</label>
        <input
          type="text"
          name="federation"
          id="federation"
          value={props.federation}
          onChange={props.handleChange}
        />
      </div>

      <div className="form-field">
        <label htmlFor="DoB">Data de Nascimento</label>
        <input
          type="date"
          name="DoB"
          id="DoB"
          max={getMaxDate()}
          required
          value={props.DoB}
          onChange={props.handleChange}
        />
      </div>

      <button type="submit">Salvar</button>
    </form>
  )
}
