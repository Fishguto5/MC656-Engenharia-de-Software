import styles from './EleicaoForm.module.css'
import CandidatoDropDown from '../CandidatoDropDown/CandidatoDropDown'
import { useEleicao } from './EleicaoContext'
import { maxDeputyDoB } from '@/lib/repository/firebaseElectionDeputyRepository'

export default function DeputadoForm() {
  const { formData, handleFieldChange, initialCandidatos, handleDropDownChange } = useEleicao()

  const maxDate = new Date(`${maxDeputyDoB()}T00:00:00`).getTime()
  const aptCandidatos = initialCandidatos.filter(
    cand => cand.dataNascimento.getTime() <= maxDate,
  )

  return (
    <div>
      <div className={`form-field ${styles.formField}`}>
        <label htmlFor="seats">Vagas disponíveis</label>
        <input
          name="seats"
          id="seats"
          type="number"
          min={1}
          autoComplete="off"
          required
          onChange={handleFieldChange}
          value={formData.seats}
        />
      </div>

      <div className={styles.candidatosContainer}>
        <label htmlFor="candidates">Candidatos Concorrendo</label>
        <CandidatoDropDown
          onChange={handleDropDownChange}
          formData={formData}
          initialCandidatos={aptCandidatos}
          onInputChange={handleFieldChange}
        />
      </div>
    </div>
  )
}
