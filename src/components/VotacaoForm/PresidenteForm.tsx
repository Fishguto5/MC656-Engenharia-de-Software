import styles from './EleicaoForm.module.css'
import CandidatoDropDown from "../CandidatoDropDown/CandidatoDropDown";
import { FormElectionData } from '@/app/(admin)/eleicao/criar/page';
import { Candidato } from '@/interfaces/eleicaoInterfaces';

interface PresidenteFormProps {
    formData: FormElectionData
    initialCandidatos: Candidato[]
}

export default function PresidenteForm(props: PresidenteFormProps){
    return (<div>
        <div className={styles.candidatosContainer}>
            <label htmlFor="cadndidates">Candidatos Concorrendo</label>
            <CandidatoDropDown
                formData={props.formData}
                initialCandidatos={props.initialCandidatos}
            ></CandidatoDropDown>
        </div>
    </div>)
}