import styles from './EleicaoForm.module.css'
import DeputadoForm from './DeputadoForm'
import PresidenteForm from './PresidenteForm'
import { useEleicao } from './EleicaoContext'
import { getDateYearsAgo } from '@/lib/utils/date'

export default function EleicaoForm() {
  const {
    isEditing,
    formData,
    electionType,
    handleFieldChange,
    handleSelectChange,
    handleSubmit,
  } = useEleicao()

  return (
    <form method="POST" action="#" className={`signup-form ${styles.signupForm}`} onSubmit={handleSubmit}>
      <div className={`form-field ${styles.formField}`}>
        <label htmlFor="title">Título</label>
        <input
          type="text"
          name="title"
          id="title"
          autoComplete="off"
          required
          onChange={handleFieldChange}
          value={formData.title}
        />
      </div>

      <div className={`form-field ${styles.formField}`}>
        <label htmlFor="description">Descrição</label>
        <textarea
          name="description"
          id="description"
          autoComplete="off"
          required
          onChange={handleFieldChange}
          value={formData.description}
        >
        </textarea>
      </div>

      <div>
        <div className={`form-field ${styles.formField}`}>
          <label htmlFor="startsAt">Início da votação</label>
          <input
            type="date"
            name="startsAt"
            id="startsAt"
            min={getDateYearsAgo(0)}
            autoComplete="off"
            required
            onChange={handleFieldChange}
            value={formData.startsAt}
          />
        </div>

        <div className={`form-field ${styles.formField}`}>
          <label htmlFor="endsAt">Fim da votação</label>
          <input
            type="date"
            name="endsAt"
            id="endsAt"
            min={formData.startsAt === '' ? getDateYearsAgo(0) : formData.startsAt}
            autoComplete="off"
            required
            onChange={handleFieldChange}
            value={formData.endsAt}
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
          value={electionType}
          onChange={handleSelectChange}
          disabled={isEditing}
        >
          <option value="president">Presidente</option>
          <option value="deputy">Deputado</option>
          <option value="public-consultation">Consulta Pública</option>
        </select>
      </div>

      {electionType === 'deputy' && (
        <DeputadoForm />
      )}
      {electionType == 'president' && (
        <PresidenteForm />
      )}

      <button type="button" className="primary-btn">Salvar Rascunho</button>
      <button type="submit" className="primary-btn">Publicar</button>
    </form>
  )
}
