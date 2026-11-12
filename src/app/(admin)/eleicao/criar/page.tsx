'use client'

import EleicaoForm from '@/components/EleicaoForm/EleicaoForm'
import { EleicaoProvider } from '@/components/EleicaoForm/EleicaoContext'
import { firebaseCandidate } from '@/lib/repository/firebaseCandidatesRepository'

const initialCandidatos = await firebaseCandidate.findAllActive() ?? []

export default function CriarEleicao() {
  return (
    <main className="signup-candidate-page">
      <h1>Criar Eleição</h1>
      <EleicaoProvider initialCandidatos={initialCandidatos} isEditing={false}>
        <EleicaoForm />
      </EleicaoProvider>
    </main>
  )
}
