'use client'

import { ChangeEvent, useEffect, useState } from 'react'
import '../../candidato.css' // Ajustado o caminho por causa da pasta [id]/editar
import { useParams, useRouter } from 'next/navigation'
import { firebaseCandidateRepository } from '@/lib/repository/firebaseCandidatesRepository'
import CandidatoForm from '@/components/CandadatoForm/CandidatoForm'

export default function EditarCandidato() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [formsData, setFormsData] = useState({
    name: '',
    party: '',
    federation: '',
    DoB: '',
  })

  useEffect(() => {
    if (id) {
      let isMounted = true

      async function getCandidato() {
        try {
          const candidato = await firebaseCandidateRepository.findById(id)
          if (isMounted && candidato) {
            setFormsData({
              name: candidato.nome,
              party: candidato.partido,
              DoB: candidato.dataNascimento.toISOString().split('T')[0],
              federation: candidato.federacao ? candidato.federacao : '',
            })
          }
        }
        catch (error) {
          console.error(error)
        }
      }

      getCandidato()

      return () => {
        isMounted = false
      }
    }
  }, [id])

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
      id,
      nome: formsData.name,
      partido: formsData.party,
      dataNascimento: validDate,
      federacao: formsData.federation,
    }

    try {
      await firebaseCandidateRepository.update(submitData)
      router.refresh()
      alert('Candidato atualizado com sucesso!')
    }
    catch (error) {
      console.error('Erro ao salvar candidato:', error)
      alert('Ocorreu um erro ao salvar os dados. Tente novamente.')
    }
  }

  return (
    <main className="signup-candidate-page center-page">
      <h1>Editar Candidato</h1>
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
