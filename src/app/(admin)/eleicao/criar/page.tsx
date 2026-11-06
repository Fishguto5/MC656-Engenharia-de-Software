'use client'

import '../votacao.css'
import EleicaoForm from '@/components/EleicaoForm/EleicaoForm'
import { EleicaoProvider } from '@/components/EleicaoForm/EleicaoContext'
import { firebaseCandidate } from '@/lib/repository/firebaseCandidatesRepository'

const initialCandidatos = await firebaseCandidate.findAllActive() ?? []

export default function CriarVotacao() {
  return (
    <main className="signup-candidate-page">
      <h1>Criar Votação</h1>
      <EleicaoProvider initialCandidatos={initialCandidatos} isEditing={false}>
        <EleicaoForm />
      </EleicaoProvider>
    </main>
  )
}
