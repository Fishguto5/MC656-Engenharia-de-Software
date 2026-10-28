import './candidatoCard.css'
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
    <article>
      <div>
        <h2>{props.nome}</h2>
        <div className="party-federation">
          <p>{props.partido}</p>
          {props.federacao && (
            <p>
              {'| ' + props.federacao}
            </p>
          )}
        </div>
      </div>

      <div className="icon-container">
        <Link href={`/admin/candidato/cadastrar?id=${props.id}`} className="card-button edit" title="Editar candidato">
          <Image src="/icons/pencil.svg" alt="Editar candidato" fill />
        </Link>
        <button className="card-button trash" title="Remover candidato" onClick={props.deleteFunction}>
          <Image src="/icons/trash.svg" alt="Remover candidato" fill />
        </button>
      </div>

    </article>
  )
}
