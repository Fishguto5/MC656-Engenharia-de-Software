import type { ElectionResult } from '@/lib/election-results'
import styles from './ElectionResults.module.css'

const typeLabels = {
  'president': 'Eleição presidencial',
  'deputy': 'Eleição para deputado federal',
  'public-consultation': 'Consulta pública',
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
})

export default function ElectionResults({ result }: { result: ElectionResult }) {
  return (
    <div className={styles.results}>
      <p>{typeLabels[result.type]}</p>
      <p>
        Votação encerrada em
        {' '}
        {dateFormatter.format(new Date(result.endsAt))}
      </p>
      {result.publishedAt && (
        <p>
          Resultado publicado em
          {' '}
          {dateFormatter.format(new Date(result.publishedAt))}
        </p>
      )}

      <dl className={styles.totals}>
        <div>
          <dt>Total de votos</dt>
          <dd>{result.totalVotos}</dd>
        </div>
        <div>
          <dt>Votos válidos</dt>
          <dd>{result.votosValidos}</dd>
        </div>
        {result.type !== 'public-consultation' && (
          <>
            <div>
              <dt>Brancos</dt>
              <dd>{result.votosBrancos}</dd>
            </div>
            <div>
              <dt>Nulos</dt>
              <dd>{result.votosNulos}</dd>
            </div>
          </>
        )}
        {result.type === 'deputy' && (
          <>
            <div>
              <dt>Votos de legenda</dt>
              <dd>{result.votosLegenda}</dd>
            </div>
            <div>
              <dt>Quociente eleitoral</dt>
              <dd>{result.quocienteEleitoral ?? 0}</dd>
            </div>
          </>
        )}
      </dl>

      {result.consulta && (
        <section className={styles.section}>
          <h2>Respostas</h2>
          <p>
            Sim:
            {' '}
            {result.consulta.sim}
          </p>
          <p>
            Não:
            {' '}
            {result.consulta.nao}
          </p>
        </section>
      )}

      {result.candidatos.length > 0 && (
        <section className={styles.section}>
          <h2>Votação por candidato</h2>
          <ol className={styles.candidates}>
            {result.candidatos.map(candidate => (
              <li key={candidate.id}>
                <span>
                  {candidate.nome}
                  {' '}
                  (
                  {candidate.partido}
                  , nº
                  {' '}
                  {candidate.numero}
                  )
                  {candidate.eleito && <strong> — Eleito</strong>}
                </span>
                <strong>{candidate.votos}</strong>
              </li>
            ))}
          </ol>
          {result.segundoTurno && <p>É necessário segundo turno para definir a presidência.</p>}
        </section>
      )}

      {result.agremiacoes.length > 0 && (
        <section className={styles.section}>
          <h2>Agremiações</h2>
          <ul className={styles.candidates}>
            {result.agremiacoes.map(item => (
              <li key={item.nome}>
                <span>{item.nome}</span>
                <span>
                  {item.votosValidos}
                  {' '}
                  votos válidos ·
                  {' '}
                  {item.vagas}
                  {' '}
                  vagas
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
