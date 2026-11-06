import { createContext, useContext, useState } from 'react'
import { ElectionStatus, ElectionType, LocalConsulta } from '@/interfaces/firebaseInterfaces'
import { Candidato, ConsultaPublica, VotosCandidato } from '@/interfaces/eleicaoInterfaces'
import { InputDateToDate } from '@/lib/utils/date'
import { firebasePublicConsultation } from '@/lib/repository/firebasePublicConsultationRepository'
import { useRouter } from 'next/navigation'
import { UF } from '@/lib/deputado'

export interface FormElectionData {
  title: string
  description: string
  startsAt: string
  endsAt: string
  state: string
  candidates: VotosCandidato[]
  scope: 'national' | 'state'
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
  const router = useRouter()
  const [electionType, setElectionType] = useState<ElectionType>('president')
  const [formData, setFormData] = useState<FormElectionData>({
    title: '',
    description: '',
    startsAt: '',
    endsAt: '',
    state: '',
    candidates: [],
    scope: 'national',
  })

  function cleanForms() {
    setFormData({
      title: '',
      description: '',
      startsAt: '',
      endsAt: '',
      state: '',
      candidates: [],
      scope: 'national',
    })
  }

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

  async function handleSubmitPublicConsultation() {
    // Validar datas
    const validDateStart = InputDateToDate(formData.startsAt)
    if (!validDateStart) {
      alert('Por favor, insira uma data de início (formato YYYY-MM-DD).')
      return
    }
    const validDateEnd = InputDateToDate(formData.endsAt)
    if (!validDateEnd) {
      alert('Por favor, insira uma data de finalização (formato YYYY-MM-DD).')
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let local: LocalConsulta = 'Brasil'
    if (formData.scope == 'state') {
      local = formData.state as UF
    }

    const status = today < validDateStart ? 'scheduled' as ElectionStatus : 'open' as ElectionStatus

    // Enviar para o DB
    const submitData = {
      id: '',
      title: formData.title,
      description: formData.description,
      startsAt: validDateStart,
      endsAt: validDateEnd,
      type: 'public-consultation' as ElectionType,
      status: status,
      createdAt: today,
      updatedAt: today,
      local: local,
      nao: 0,
      sim: 0,

    } as ConsultaPublica

    try {
      await firebasePublicConsultation.create(submitData)
      cleanForms()
      router.refresh()
    }
    catch (error) {
      console.error('Erro ao salvar consulta pública:', error)
      alert('Ocorreu um erro ao salvar os dados. Tente novamente.')
    }
  }

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()

    switch (electionType) {
      case 'public-consultation':
        handleSubmitPublicConsultation()
        console.log('Dados Enviados:', { electionType, ...formData })
        alert('Formulário enviado com sucesso!')
        break

      default:
        console.error('Tipo de eleição não suportado')
        break
    }
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
