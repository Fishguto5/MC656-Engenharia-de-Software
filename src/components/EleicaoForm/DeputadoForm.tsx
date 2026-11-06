import styles from './EleicaoForm.module.css'
import CandidatoDropDown from '../CandidatoDropDown/CandidatoDropDown'
import { useEleicao } from './EleicaoContext'
import { maxDeputyDoB } from '@/lib/repository/firebaseElectionDeputyRepository'
import { LISTA_UFS } from '@/lib/deputado'

export default function DeputadoForm() {
  const { formData, handleFieldChange, initialCandidatos, handleDropDownChange } = useEleicao()

  const maxDate = new Date(`${maxDeputyDoB()}T00:00:00`).getTime()
  const aptCandidatos = initialCandidatos.filter(
    cand => cand.dataNascimento.getTime() <= maxDate,
  )

  return (
    <div>

      <div className={`form-field ${styles.formField}`}>
        <label htmlFor="state">Estado</label>
        <select
          name="state"
          id="state"
          autoComplete="off"
          required
          onChange={handleFieldChange}
          value={formData.state}
        >
          {LISTA_UFS.map(uf => (
            <option value={uf} id={uf} key={uf}>{uf}</option>
          ))}
        </select>
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
