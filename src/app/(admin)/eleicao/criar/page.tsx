'use client'

import { ChangeEvent, useState } from 'react'
import '../votacao.css'
import { useRouter } from 'next/navigation'
import { ElectionType } from '@/interfaces/firebaseInterfaces'
import EleicaoForm from '@/components/VotacaoForm/EleicaoForm'
import { Candidato, VotosCandidato } from '@/interfaces/eleicaoInterfaces'

// TEMPORÁRIOA ========================================
const candidatosMock: Candidato[] = [
  // --- GRUPO 1: Entre 21 e 31 anos (3 candidatos) ---
  {
    id: "1",
    nome: "Ana Beatriz Souza",
    partido: "PIP (Partido da Inovação e Progresso)",
    dataNascimento: new Date("2001-04-15"), // 25 anos em 2026
    federacao: "Federação Inovação Sustentável"
  },
  {
    id: "2",
    nome: "Lucas Gabriel Mendes",
    partido: "MCL (Movimento Cidadão Livre)",
    dataNascimento: new Date("1997-09-22"), // 29 anos em 2026
    federacao: "Federação Cidadania Ativa"
  },
  {
    id: "3",
    nome: "Mariana Costa Lima",
    partido: "FDS (Frente Democrática Sustentável)",
    dataNascimento: new Date("2003-11-10"), // 23 anos em 2026
  },

  // --- GRUPO 2: Mais de 31 anos (2 candidatos) ---
  {
    id: "4",
    nome: "Carlos Eduardo Silveira",
    partido: "PUT (Partido da União Tecnológica)",
    dataNascimento: new Date("1984-01-05"), // 42 anos em 2026
  },
  {
    id: "5",
    nome: "Roberto Carlos de Oliveira",
    partido: "RPB (Renovação Popular Brasileira)",
    dataNascimento: new Date("1971-07-18"), // 55 anos em 2026
  }
];
// ====================================================

export interface FormElectionData {
  title: string,
  description: string,
  startsAt: string,
  endsAt: string,
  seats: string,
  cadndidates: VotosCandidato[],
}

export default function CriarVotacao() {
  const router = useRouter()

  // Estado para controlar a opção selecionada no <select>
  const [electionType, setElectionType] = useState<ElectionType>('president');

  // armazenar os dados do formulário
  const [formData, setFormData] = useState<FormElectionData>({
    title: '',
    description: '',
    startsAt: '',
    endsAt: '',
    seats: '',
    cadndidates: [],
  });

  function cleanForm() {
    setFormData({
      title: '',
      description: '',
      startsAt: '',
      endsAt: '',
      seats: '',
      cadndidates: [],
    })
  }

  function cleanDynamicForm() {
    setFormData((prev) => ({
      ...prev,
      seats: '',
      cadndidates: [],
    }))
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  function handleTextAreaChange(e: React.ChangeEvent<HTMLTextAreaElement>){
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newType = e.target.value as ElectionType;
    setElectionType(newType);
    cleanDynamicForm()
  };

  async function handleSubmit (e: React.SubmitEvent) {
    e.preventDefault();
    console.log('Dados Enviados:', { electionType, ...formData });
    alert('Formulário enviado com sucesso! Confira o console.');
    cleanForm()
  };

  function InputDateToDate(date: string): Date | null {
    const regex = /^\d{4}-\d{2}-\d{2}$/

    if (regex.test(date)) {
      const [year, month, day] = date.split('-').map(Number)
      return new Date(year, month - 1, day)
    }
    return null
  }

  return (
    <main className="signup-candidate-page">
      <h1>Criar Votacao</h1>
      <EleicaoForm
        isEditing={false}
        formData={formData}
        electionType={electionType}
        initialCandidatos={candidatosMock}
        handleInputChange={handleInputChange}
        handleTextAreaChange={handleTextAreaChange}
        handleSelectChange={handleSelectChange}
        handleSubmit={handleSubmit}
        handlleSave={async () => {}}
      >
      </EleicaoForm>
    </main>
  )
}
