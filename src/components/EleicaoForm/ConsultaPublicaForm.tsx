import styles from './EleicaoForm.module.css'
import { useEleicao } from './EleicaoContext'
import { LISTA_UFS } from '@/lib/deputado'

export default function ConsultaPublicaForm() {
  const { formData, handleFieldChange } = useEleicao()

  return (
    <div>
      <div className={`form-field ${styles.formField}`}>
        <label htmlFor="scope">Jurisdição</label>
        <select
          name="scope"
          id="scope"
          autoComplete="off"
          required
          onChange={handleFieldChange}
          value={formData.scope}
        >
          <option value="national" id="national">Nacional</option>
          <option value="state" id="state">Estadual</option>
        </select>
      </div>

      {formData.scope == 'state' && (
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
      )}
    </div>
  )
}
