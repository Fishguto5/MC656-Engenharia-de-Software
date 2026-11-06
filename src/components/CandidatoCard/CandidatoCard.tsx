import styles from './candidatoCard.module.css'
import Link from 'next/link'
import Image from 'next/image'

type CandidatoProps = {
  id: string
  nome: string
  partido: string
  federacao?: string
  deleteFunction: () => void
}

export default function CandidatoCard(props: CandidatoProps) {
  return (
    <article className={styles.card}>
      <div>
        <h2 className={styles.title}>{props.nome}</h2>
        <div className={styles.partyFederation}>
          <p>{props.partido}</p>
          {props.federacao && (
            <p>
              {'| ' + props.federacao}
            </p>
          )}
        </div>
      </div>

      <div className={styles.iconContainer}>
        <Link href={`/candidato/${props.id}/editar`} className={`${styles.cardButton} ${styles.edit}`} title="Editar candidato">
          <Image src="/icons/pencil.svg" alt="Editar candidato" fill loading="eager" />
        </Link>
        <button className={`${styles.cardButton} ${styles.trash}`} title="Remover candidato" onClick={props.deleteFunction}>
          <Image src="/icons/trash.svg" alt="Remover candidato" fill loading="eager" />
        </button>
      </div>

    </article>
  )
}
