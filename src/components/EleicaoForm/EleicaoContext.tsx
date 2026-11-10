import { createContext, useContext, useEffect, useState } from 'react'
import { ElectionStatus, LocalConsulta } from '@/interfaces/firebaseInterfaces'
import { Candidato, ConsultaPublica, EleicaoDeputado, EleicaoPresidente, VotosCandidato } from '@/interfaces/eleicaoInterfaces'
import { InputDateToDate, RawDocumentTimeToDate } from '@/lib/utils/date'
import { useRouter } from 'next/navigation'
import { firebaseElection } from '@/lib/repository/FirebaseElectionFacade'
import { ElectionType, UF } from '@/lib/constants/election'

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
  handleSaveDraft: () => Promise<void>
}

const EleicaoContext = createContext<EleicaoContextData | undefined>(undefined)

export function EleicaoProvider({
  children,
  initialCandidatos,
  isEditing = false,
  electionId,
}: {
  children: React.ReactNode
  initialCandidatos: Candidato[]
  isEditing?: boolean
  electionId?: string
}) {
  const router = useRouter()
  const [electionType, setElectionType] = useState<ElectionType>('president')
  const [formData, setFormData] = useState<FormElectionData>({
    title: '',
    description: '',
    startsAt: '',
    endsAt: '',
    state: 'AC' as UF,
    candidates: [],
    scope: 'national',
  })
  const [electionFound, setElectionFound] = useState<boolean>(false)

  // --- PEGAR DADOS DO ELECTION ID ----
  useEffect(() => {
    let isMounted = true

    async function getEleicao() {
      const id = electionId
      if (!id || !isEditing) return

      try {
        const tipoEleicao = await firebaseElection.getDraftType(id)
        if (!tipoEleicao) return

        const eleicao = await firebaseElection.findDraftById(id, tipoEleicao)
        if (isMounted && eleicao) {
          const state: UF
            = ('local' in eleicao && eleicao.local && eleicao.local !== 'Brasil')
              ? (eleicao.local as UF)
              : ('uf' in eleicao && eleicao.uf)
                  ? eleicao.uf
                  : 'AC'

          setFormData(prev => ({
            ...prev,
            title: eleicao.title ?? '',
            description: eleicao.description ?? '',
            startsAt: eleicao.startsAt ? eleicao.startsAt.toISOString().split('T')[0] : '',
            endsAt: eleicao.endsAt ? eleicao.endsAt.toISOString().split('T')[0] : '',
            candidates: ('candidatos' in eleicao && eleicao.candidatos) ? eleicao.candidatos : [],
            scope: ('local' in eleicao && eleicao.local && eleicao.local !== 'Brasil') ? 'state' : 'national',
            state: state,
          }))

          setElectionType(tipoEleicao)
          setElectionFound(true)
        }
      }
      catch (error) {
        console.error(error)
      }
    }

    getEleicao()

    return () => {
      isMounted = false
    }
  }, [electionId, isEditing])

  function cleanForms() {
    setFormData({
      title: '',
      description: '',
      startsAt: '',
      endsAt: '',
      state: 'AC',
      candidates: [],
      scope: 'national',
    })
  }

  // --- HANDLERS DO SAVE ----
  async function handleSaveDraftPublicConsultation() {
    // 1. Converter strings de data para Date (se preenchidas)
    const startsAtDate = formData.startsAt ? InputDateToDate(formData.startsAt) ?? undefined : undefined
    const endsAtDate = formData.endsAt ? InputDateToDate(formData.endsAt) ?? undefined : undefined

    // 2. Mapear escopo local
    let local: LocalConsulta | undefined
    if (formData.scope === 'national') {
      local = 'Brasil'
    }
    else if (formData.scope === 'state' && formData.state) {
      local = formData.state as UF
    }

    // 3. Montar o objeto parcial do domínio
    const draftData: Partial<ConsultaPublica> = {
      title: formData.title || undefined,
      description: formData.description || undefined,
      startsAt: startsAtDate,
      endsAt: endsAtDate,
      type: 'public-consultation',
      local: local,
    }
    const id = (isEditing && electionId) ? electionId : null

    try {
      // 4. Chamar repositório enviando draftId (se existir) e o objeto parcial
      console.log(draftData)
      await firebaseElection.saveDraft('public-consultation', id, draftData)

      // Atualiza o ID do rascunho no estado local/URL para salvamentos subsequentes
      alert('Rascunho de consulta pública salvo com sucesso!')
      if (!isEditing || !electionId) {
        cleanForms()
      }
    }
    catch (error: unknown) {
      console.error('Erro ao salvar rascunho de consulta pública:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro ao salvar o rascunho. Tente novamente.'
      alert(errorMessage)
    }
  }

  async function handleSaveDraftPresident() {
    // 1. Converter strings de data para Date (se preenchidas)
    const startsAtDate = formData.startsAt ? InputDateToDate(formData.startsAt) ?? undefined : undefined
    const endsAtDate = formData.endsAt ? InputDateToDate(formData.endsAt) ?? undefined : undefined

    // 2. Sanitizar candidatos se houver algum na lista
    const sanitizedCandidates: VotosCandidato[] | undefined = formData.candidates?.map(candidate => ({
      ...candidate,
      dataNascimento: RawDocumentTimeToDate(candidate.dataNascimento),
      votos: candidate.votos ?? 0,
      numero: candidate.numero,
    }))

    // 3. Montar o objeto parcial do domínio
    const draftData: Partial<EleicaoPresidente> = {
      title: formData.title || undefined,
      description: formData.description || undefined,
      startsAt: startsAtDate,
      endsAt: endsAtDate,
      type: 'president',
      candidatos: sanitizedCandidates,
    }
    const id = (isEditing && electionId) ? electionId : null

    try {
      await firebaseElection.saveDraft('president', id, draftData)

      alert('Rascunho de eleição para presidente salvo com sucesso!')
      if (!isEditing || !electionId) {
        cleanForms()
      }
    }
    catch (error: unknown) {
      console.error('Erro ao salvar rascunho de consulta pública:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro ao salvar o rascunho. Tente novamente.'
      alert(errorMessage)
    }
  }

  async function handleSaveDraftDeputy() {
    // 1. Converter strings de data para Date (se preenchidas)
    const startsAtDate = formData.startsAt ? InputDateToDate(formData.startsAt) ?? undefined : undefined
    const endsAtDate = formData.endsAt ? InputDateToDate(formData.endsAt) ?? undefined : undefined

    // 2. Sanitizar candidatos se houver algum na lista
    const sanitizedCandidates: VotosCandidato[] | undefined = formData.candidates?.map(candidate => ({
      ...candidate,
      dataNascimento: RawDocumentTimeToDate(candidate.dataNascimento),
      votos: candidate.votos ?? 0,
      numero: candidate.numero,
    }))

    // 3. Montar o objeto parcial do domínio
    const draftData: Partial<EleicaoDeputado> = {
      title: formData.title || undefined,
      description: formData.description || undefined,
      startsAt: startsAtDate,
      endsAt: endsAtDate,
      type: 'deputy',
      uf: (formData.state as UF) || undefined,
      candidatos: sanitizedCandidates,
    }
    const id = (isEditing && electionId) ? electionId : null

    try {
      await firebaseElection.saveDraft('deputy', id, draftData)

      alert('Rascunho de eleição para deputado salvo com sucesso!')
      if (!isEditing || !electionId) {
        cleanForms()
      }
    }
    catch (error: unknown) {
      console.error('Erro ao salvar rascunho de consulta pública:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro ao salvar o rascunho. Tente novamente.'
      alert(errorMessage)
    }
  }

  async function handleSaveDraft() {
    switch (electionType) {
      case 'public-consultation':
        await handleSaveDraftPublicConsultation()
        break

      case 'president':
        await handleSaveDraftPresident()
        break

      case 'deputy':
        await handleSaveDraftDeputy()
        break

      default:
        console.error('Tipo de eleição não suportado para rascunho')
        break
    }
  }

  // --- HANDLERS DOS FIELDS ----
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

  // --- HANDLERS DO SUBMIT ----
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
      if (isEditing && electionId) {
        submitData.id = electionId
        await firebaseElection.update('public-consultation', submitData)
      }
      else {
        await firebaseElection.create('public-consultation', submitData)
        cleanForms()
      }

      router.refresh()
    }
    catch (error) {
      console.error('Erro ao salvar consulta pública:', error)
      alert('Ocorreu um erro ao salvar os dados. Tente novamente.')
    }
  }

  async function handleSubmitPresident() {
    // 1. Validação de datas
    const validDateStart = InputDateToDate(formData.startsAt)
    if (!validDateStart) {
      alert('Por favor, insira uma data de início válida (formato YYYY-MM-DD).')
      return
    }
    const validDateEnd = InputDateToDate(formData.endsAt)
    if (!validDateEnd) {
      alert('Por favor, insira uma data de finalização válida (formato YYYY-MM-DD).')
      return
    }

    if (validDateEnd < validDateStart) {
      alert('A data de término deve ser posterior à data de início.')
      return
    }

    // 2. Determinar status
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const status: ElectionStatus = today < validDateStart ? 'scheduled' : 'open'

    // 3. Sanitizar candidatos e extrair Agremiações
    const sanitizedCandidates: VotosCandidato[] = (formData.candidates || []).map(candidate => ({
      ...candidate,
      dataNascimento: RawDocumentTimeToDate(candidate.dataNascimento),
      votos: candidate.votos ?? 0,
      numero: candidate.numero,
    }))

    // Enviar para o DB
    const submitData = {
      id: '',
      title: formData.title,
      description: formData.description,
      startsAt: validDateStart,
      endsAt: validDateEnd,
      type: 'president' as ElectionType,
      status: status,
      createdAt: today,
      updatedAt: today,
      candidatos: sanitizedCandidates,
      turno: 1,
      votosBrancos: 0,
      votosNulos: 0,

    } as EleicaoPresidente

    try {
      if (isEditing && electionId) {
        submitData.id = electionId
        await firebaseElection.update('president', submitData)
      }
      else {
        await firebaseElection.create('president', submitData)
        cleanForms()
      }
      router.refresh()
    }
    catch (error) {
      console.error('Erro ao salvar eleição para presidente:', error)
      alert('Ocorreu um erro ao salvar os dados. Tente novamente.')
    }
  }

  async function handleSubmitDeputy() {
    // 1. Validação de datas
    const validDateStart = InputDateToDate(formData.startsAt)
    if (!validDateStart) {
      alert('Por favor, insira uma data de início válida (formato YYYY-MM-DD).')
      return
    }
    const validDateEnd = InputDateToDate(formData.endsAt)
    if (!validDateEnd) {
      alert('Por favor, insira uma data de finalização válida (formato YYYY-MM-DD).')
      return
    }

    if (validDateEnd < validDateStart) {
      alert('A data de término deve ser posterior à data de início.')
      return
    }

    // 2. Determinar status
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const status: ElectionStatus = today < validDateStart ? 'scheduled' : 'open'

    // 3. Sanitizar candidatos e extrair Agremiações
    const sanitizedCandidates: VotosCandidato[] = (formData.candidates || []).map(candidate => ({
      ...candidate,
      dataNascimento: RawDocumentTimeToDate(candidate.dataNascimento),
      votos: candidate.votos ?? 0,
      numero: candidate.numero,
    }))

    // Extrai federações ou partidos como agremiações únicas
    const agremiacoesSet = new Set<string>()
    const votosLegendaInicial: Record<string, number> = {}

    sanitizedCandidates.forEach((candidate) => {
      // Se tiver federação, a lei considera a federação como uma única agremiação
      const agremiacao = candidate.federacao?.trim() || candidate.partido.trim()
      if (agremiacao) {
        agremiacoesSet.add(agremiacao)
        votosLegendaInicial[agremiacao] = 0 // Inicializa a contagem de votos de legenda da agremiação zerada
      }
    })

    const agremiacoes = Array.from(agremiacoesSet)

    // 4. Montar o payload final para o domínio
    const submitData: EleicaoDeputado = {
      id: '', // Gerado automaticamente pelo repositório
      title: formData.title,
      description: formData.description,
      startsAt: validDateStart,
      endsAt: validDateEnd,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
      type: 'deputy',
      uf: formData.state as UF,
      agremiacoes, // Lista de partidos/federações extraída automaticamente
      candidatos: sanitizedCandidates,
      votosLegenda: votosLegendaInicial, // Mapa de votos de legenda zerado
      votosBrancos: 0,
      votosNulos: 0,
    }

    try {
      if (isEditing && electionId) {
        submitData.id = electionId
        await firebaseElection.update('deputy', submitData)
      }
      else {
        await firebaseElection.create('deputy', submitData)
        cleanForms()
      }
      router.refresh()
    }
    catch (error) {
      console.error('Erro ao salvar eleição para deputado:', error)
      alert('Ocorreu um erro ao salvar os dados da eleição de deputado. Tente novamente.')
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

      case 'president':
        handleSubmitPresident()
        console.log('Dados Enviados:', { electionType, ...formData })
        alert('Formulário enviado com sucesso!')
        break

      case 'deputy':
        handleSubmitDeputy()
        console.log('Dados Enviados:', { electionType, ...formData })
        alert('Formulário enviado com sucesso!')
        break

      default:
        console.error('Tipo de eleição não suportado')
        break
    }
  }

  return ((isEditing && electionId && !electionFound)
    ? <h2>404: Rascunho da eleição não encontrada</h2>
    : (
        <EleicaoContext.Provider value={{
          formData,
          electionType,
          initialCandidatos,
          isEditing,
          handleFieldChange,
          handleSelectChange,
          handleDropDownChange,
          handleSubmit,
          handleSaveDraft,
        }}
        >
          {children}
        </EleicaoContext.Provider>
      )
  )
}

export function useEleicao() {
  const context = useContext(EleicaoContext)
  if (!context) throw new Error('useEleicao deve ser usado dentro de um EleicaoProvider')
  return context
}
