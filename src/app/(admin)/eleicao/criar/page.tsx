'use client'

import '../votacao.css'
import EleicaoForm from '@/components/EleicaoForm/EleicaoForm'
import { Candidato } from '@/interfaces/eleicaoInterfaces'
import { EleicaoProvider } from '@/components/EleicaoForm/EleicaoContext'

// TEMPORÁRIOA ========================================
const candidatosMock: Candidato[] = [
  // --- GRUPO 1: Entre 21 e 31 anos (3 candidatos) ---
  {
    id: '1',
    nome: 'Ana Beatriz Souza',
    partido: 'PIP (Partido da Inovação e Progresso)',
    dataNascimento: new Date('2001-04-15'), // 25 anos em 2026
    federacao: 'Federação Inovação Sustentável',
  },
  {
    id: '2',
    nome: 'Lucas Gabriel Mendes',
    partido: 'MCL (Movimento Cidadão Livre)',
    dataNascimento: new Date('1997-09-22'), // 29 anos em 2026
    federacao: 'Federação Cidadania Ativa',
  },
  {
    id: '3',
    nome: 'Mariana Costa Lima',
    partido: 'FDS (Frente Democrática Sustentável)',
    dataNascimento: new Date('2003-11-10'), // 23 anos em 2026
  },

  // --- GRUPO 2: Mais de 31 anos (2 candidatos) ---
  {
    id: '4',
    nome: 'Carlos Eduardo Silveira',
    partido: 'PUT (Partido da União Tecnológica)',
    dataNascimento: new Date('1984-01-05'), // 42 anos em 2026
  },
  {
    id: '5',
    nome: 'Roberto Carlos de Oliveira',
    partido: 'RPB (Renovação Popular Brasileira)',
    dataNascimento: new Date('1971-07-18'), // 55 anos em 2026
  },
]
// ====================================================

export default function CriarVotacao() {
  return (
    <main className="signup-candidate-page">
      <h1>Criar Votação</h1>
      <EleicaoProvider initialCandidatos={candidatosMock} isEditing={false}>
        <EleicaoForm />
      </EleicaoProvider>
    </main>
  )
}
