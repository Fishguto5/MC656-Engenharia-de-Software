import { FormElectionData } from '@/app/(admin)/eleicao/criar/page'
import styles from './EleicaoForm.module.css'

interface DeputadoFormProps {
  formData: FormElectionData
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function DeputadoForm(props: DeputadoFormProps){
    return (<div>
        <div className={`form-field ${styles.formField}`}>
            <label htmlFor="seats">Vagas disponíveis</label>
            <input
                name="seats"
                id="seats"
                type="number"
                min={1}
                autoComplete="off"
                required
                onChange={props.handleInputChange}
                value={props.formData.seats}
            />
        </div>

        <div>
            DROPDOWN
        </div>
    </div>)
}