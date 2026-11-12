import styles from './EleicaoForm.module.css'
import CandidatoDropDown from '../CandidatoDropDown/CandidatoDropDown'
import { useEleicao } from './EleicaoContext'
import { maxPresidentDoB } from '@/lib/repository/firebaseElectionPresidentRepository'

export default function PresidenteForm() {
  const { formData, handleFieldChange, initialCandidatos, handleDropDownChange } = useEleicao()

  const maxDate = new Date(`${maxPresidentDoB()}T00:00:00`).getTime()
  const aptCandidatos = initialCandidatos.filter(
    cand => cand.dataNascimento.getTime() <= maxDate,
  )

  return (
    <div className={styles.candidatosContainer}>
      <label htmlFor="candidates">Candidatos Concorrendo</label>
      <CandidatoDropDown
        onChange={handleDropDownChange}
        formData={formData}
        initialCandidatos={aptCandidatos}
        onInputChange={handleFieldChange}
      >
      </CandidatoDropDown>
    </div>
  )
}
