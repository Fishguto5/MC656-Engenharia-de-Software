import styles from './EleicaoForm.module.css'
import { getMaxDate } from '@/lib/repository/firebaseCandidatesRepository'
import DeputadoForm from './DeputadoForm'
import PresidenteForm from './PresidenteForm'
import { ElectionType } from '@/interfaces/firebaseInterfaces'
import { FormElectionData } from '@/app/(admin)/eleicao/criar/page'
import { Candidato } from '@/interfaces/eleicaoInterfaces'

interface EleicaoFormProps {
  isEditing: boolean
  formData: FormElectionData
  electionType: ElectionType
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSelectChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  handleTextAreaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (e: React.SubmitEvent) => Promise<void>
  handlleSave: () => Promise<void>
  initialCandidatos: Candidato[]
}

export default function EleicaoForm(props: EleicaoFormProps) {

  return (
    <form method="POST" action="#" className={`signup-form ${styles.signupForm}`} onSubmit={props.handleSubmit}>
      <div className={`form-field ${styles.formField}`}>
        <label htmlFor="title">Título</label>
        <input
          type="text"
          name="title"
          id="title"
          autoComplete="off"
          required
          onChange={props.handleInputChange}
          value={props.formData.title}
        />
      </div>

      <div className={`form-field ${styles.formField}`}>
        <label htmlFor="description">Descrição</label>
        <textarea 
            name="description"
            id="description"
            autoComplete="off"
            required
            onChange={props.handleTextAreaChange}
            value={props.formData.description}
        ></textarea>
      </div>

      <div>
        <div className={`form-field ${styles.formField}`}>
          <label htmlFor="startsAt">Início da votação</label>
          <input
            type="date"
            name="startsAt"
            id="startsAt"
            // max={getMaxDate()}
            autoComplete="off"
            required
            onChange={props.handleInputChange}
            value={props.formData.startsAt}
          />
        </div>
        
        <div className={`form-field ${styles.formField}`}>
          <label htmlFor="endsAt">Fim da votação</label>
          <input
            type="date"
            name="endsAt"
            id="endsAt"
            // max={getMaxDate()}
            autoComplete="off"
            required
            onChange={props.handleInputChange}
            value={props.formData.endsAt}
          />
        </div>
      </div>

      <div className={`form-field ${styles.formField}`}>
        <label htmlFor="type">Tipo de votação</label>
        <select 
            name="type" 
            id="type"
            autoComplete="off"
            required
            value={props.electionType}
            onChange={props.handleSelectChange}
            disabled={props.isEditing}
        >
            <option value="president">Presidente</option>
            <option value="deputy">Deputado</option>
            <option value="public-consultation">Consulta Pública</option>
        </select>
      </div>

      {props.electionType === "deputy" && 
        <DeputadoForm 
          formData={props.formData}
          handleInputChange={props.handleInputChange}
        ></DeputadoForm>
      }
      {props.electionType == "president" && 
        <PresidenteForm
          formData={props.formData}
          initialCandidatos={props.initialCandidatos}
        ></PresidenteForm>
      }

      <button type="button" className='primary-btn'>Salvar</button>
      <button type="submit" className='primary-btn'>Publicar</button>
    </form>
  )
}
