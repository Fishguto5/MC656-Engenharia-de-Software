import { createContext, useContext, useState } from 'react'
import { ElectionType } from '@/interfaces/firebaseInterfaces'
import { Candidato, VotosCandidato } from '@/interfaces/eleicaoInterfaces'

export interface FormElectionData {
  title: string
  description: string
  startsAt: string
  endsAt: string
  state: string
  candidates: VotosCandidato[]
}

interface EleicaoContextData {
  formData: FormElectionData
  electionType: ElectionType
  initialCandidatos: Candidato[]
  isEditing: boolean
  handleFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  handleSelectChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  handleDropDownChange: (updatedCandidates: VotosCandidato[]) => void
  handleSubmit: (e: React.SubmitEvent) => Promise<void>
}

const EleicaoContext = createContext<EleicaoContextData | undefined>(undefined)

export function EleicaoProvider({
  children,
  initialCandidatos,
  isEditing = false,
}: {
  children: React.ReactNode
  initialCandidatos: Candidato[]
  isEditing?: boolean
}) {
  const [electionType, setElectionType] = useState<ElectionType>('president')
  const [formData, setFormData] = useState<FormElectionData>({
    title: '',
    description: '',
    startsAt: '',
    endsAt: '',
    state: '',
    candidates: [],
  })

  function handleFieldChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    const [prefix, id] = name.split('-')

    if (prefix === 'numero') {
      const parsedValue = value === '' ? 0 : parseInt(value, 10)

      setFormData(prev => ({
        ...prev,
        candidates: prev.candidates.map(cand =>
          cand.id === id ? { ...cand, numero: isNaN(parsedValue) ? 0 : parsedValue } : cand,
        ),
      }))
      return
    }

    setFormData(prev => ({ ...prev, [name]: value }))
  }

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newType = e.target.value as ElectionType
    setElectionType(newType)
    setFormData(prev => ({ ...prev, state: '', candidates: [] }))
  }

  function handleDropDownChange(updatedCandidates: VotosCandidato[]) {
    setFormData(prev => ({ ...prev, candidates: updatedCandidates }))
  }

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    console.log('Dados Enviados:', { electionType, ...formData })
    alert('Formulário enviado com sucesso!')
  }

  return (
    <EleicaoContext.Provider value={{
      formData,
      electionType,
      initialCandidatos,
      isEditing,
      handleFieldChange,
      handleSelectChange,
      handleDropDownChange,
      handleSubmit,
    }}
    >
      {children}
    </EleicaoContext.Provider>
  )
}

export function useEleicao() {
  const context = useContext(EleicaoContext)
  if (!context) throw new Error('useEleicao deve ser usado dentro de um EleicaoProvider')
  return context
}
