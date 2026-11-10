'use client'

import EleicaoForm from '@/components/EleicaoForm/EleicaoForm'
import { EleicaoProvider } from '@/components/EleicaoForm/EleicaoContext'
import { firebaseCandidate } from '@/lib/repository/firebaseCandidatesRepository'
import { useParams } from 'next/navigation'

const initialCandidatos = await firebaseCandidate.findAllActive() ?? []

export default function EditarEleicao() {
    const params = useParams()
    const id = params.id as string
  return (
    <main className="signup-candidate-page">
      <h1>Editar Eleição</h1>
      <EleicaoProvider initialCandidatos={initialCandidatos} isEditing={true} electionId={id}>
        <EleicaoForm />
      </EleicaoProvider>
    </main>
  )
}
