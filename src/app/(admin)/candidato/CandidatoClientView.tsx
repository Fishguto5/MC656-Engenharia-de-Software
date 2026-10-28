'use client'

import CandidatoCard from '@/components/CandidatoCard/CandidatoCard'
import './candidato.css'
import { Candidato } from '@/interfaces/eleicaoInterfaces'
import { useState } from 'react'
import Link from 'next/link'
import { firebaseCandidateRepository } from '@/lib/repository/firebaseCandidatesRepository'

export default function CandidatoClientView({ initialCandidatos }: { initialCandidatos: Candidato[] }) {
  const [candidatos, setCandidatos] = useState<Candidato[]>(initialCandidatos)

  async function handleDelete(id: string) {
    const candidatosAnteriores = candidatos
    setCandidatos(prev => prev.filter(c => c.id !== id))

    try {
      await firebaseCandidateRepository.deactivate(id)
    }
    catch (error) {
      console.error('Erro ao desativar candidato:', error)
      setCandidatos(candidatosAnteriores)
      alert('Não foi possível desativar o candidato. Tente novamente.')
    }
  }

  return (
    <main className="signup-candidate-page">
      <header>
        <Link href="/candidato/cadastrar" className="adicionar-candidato">Novo Candidato</Link>
      </header>
      <section className="candidate-list">
        <h1>Lista de Candidatos</h1>
        {candidatos.map((cand) => {
          return (
            <CandidatoCard
              key={cand.id}
              id={cand.id}
              nome={cand.nome}
              partido={cand.partido}
              federacao={cand.federacao}
              deleteFunction={() => { handleDelete(cand.id) }}
            />
          )
        })}
      </section>

    </main>
  )
}
