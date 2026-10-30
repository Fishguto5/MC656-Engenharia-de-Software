'use client'

import { ChangeEvent, useState } from 'react'
import '../candidato.css'
import { firebaseCandidateRepository } from '@/lib/repository/firebaseCandidatesRepository'
import { useRouter } from 'next/navigation'
import CandidatoForm from '@/components/CandadatoForm/CandidatoForm'

export default function CadastrarCandidato() {
  const router = useRouter()
  const [formsData, setFormsData] = useState({
    name: '',
    party: '',
    federation: '',
    DoB: '',
  })

  function cleanForms() {
    setFormsData({
      name: '',
      party: '',
      federation: '',
      DoB: '',
    })
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setFormsData({
      ...formsData,
      [e.target.name]: e.target.value,
    })
  }

  function InputDateToDate(date: string): Date | null {
    const regex = /^\d{4}-\d{2}-\d{2}$/

    if (regex.test(date)) {
      const [year, month, day] = date.split('-').map(Number)
      return new Date(year, month - 1, day)
    }
    return null
  }

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()

    const validDate = InputDateToDate(formsData.DoB)
    if (!validDate) {
      alert('Por favor, insira uma data de nascimento válida (formato YYYY-MM-DD).')
      return
    }

    const submitData = {
      id: '',
      nome: formsData.name,
      partido: formsData.party,
      dataNascimento: validDate,
      federacao: formsData.federation,
    }

    try {
      await firebaseCandidateRepository.create(submitData)
      alert('Candidato criado com sucesso!')
      cleanForms()
      router.refresh()
    }
    catch (error) {
      console.error('Erro ao salvar candidato:', error)
      alert('Ocorreu um erro ao salvar os dados. Tente novamente.')
    }
  }

  return (
    <main className="signup-candidate-page center-page">
      <h1>Criar Candidato</h1>
      <CandidatoForm
        name={formsData.name}
        party={formsData.party}
        federation={formsData.federation}
        DoB={formsData.DoB}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
      >
      </CandidatoForm>
    </main>
  )
}
