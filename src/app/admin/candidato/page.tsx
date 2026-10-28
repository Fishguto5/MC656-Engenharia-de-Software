'use client'

import CandidatoCard from '@/components/CandidatoCard/CandidatoCard'
import './candidato.css'
import { Candidato } from '@/interfaces/eleicaoInterfaces'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { firebaseCandidateRepository } from '@/lib/repository/firebaseCandidatesRepository'

export default function CadastrarCandidato() {
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  useEffect(() => {
    // Flag to prevent state updates if the component unmounts mid-fetch
    let isMounted = true

    async function loadCandidatos() {
      try {
        const list = await firebaseCandidateRepository.findAllActive()
        if (isMounted) {
          setCandidatos(list)
        }
      }
      catch (error) {
        console.error(error)
      }
    }

    loadCandidatos()

    return () => {
      isMounted = false
    }
  }, [])

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
        <Link href="/admin/candidato/cadastrar" className="adicionar-candidato">Novo Candidato</Link>
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
