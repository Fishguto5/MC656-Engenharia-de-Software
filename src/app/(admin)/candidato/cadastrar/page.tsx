'use client'

import { ChangeEvent, useState } from 'react'
import '../candidato.css'
import { firebaseCandidateRepository } from '@/lib/repository/firebaseCandidatesRepository'
import { useRouter } from 'next/navigation'

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

  async function handleSubmit(e: React.FormEvent) {
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
      <form method="POST" action="#" className="signup-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="name">Nome</label>
          <input
            type="text"
            name="name"
            id="name"
            autoComplete="name"
            required
            value={formsData.name}
            onChange={handleChange}
          />
        </div>

        <div className="form-field">
          <label htmlFor="party">Partido</label>
          <input
            type="text"
            name="party"
            id="party"
            required
            value={formsData.party}
            onChange={handleChange}
          />
        </div>

        <div className="form-field">
          <label htmlFor="federation">Federação (Opicional)</label>
          <input
            type="text"
            name="federation"
            id="federation"
            value={formsData.federation}
            onChange={handleChange}
          />
        </div>

        <div className="form-field">
          <label htmlFor="DoB">Data de Nascimento</label>
          <input
            type="date"
            name="DoB"
            id="DoB"
            required
            value={formsData.DoB}
            onChange={handleChange}
          />
        </div>

        <button type="submit">Salvar</button>
      </form>
    </main>
  )
}
