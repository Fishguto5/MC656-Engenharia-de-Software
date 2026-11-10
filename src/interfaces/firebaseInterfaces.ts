import { UF } from '@/lib/deputado'
import { Timestamp } from '@firebase/firestore'

// Interface Base da eleição
export type ElectionStatus = 'draft' | 'scheduled' | 'open' | 'closed' | 'cancelled'
const valuesElectionType = ['president', 'deputy', 'public-consultation'] as const
export const validElectionType = new Set<string>(valuesElectionType)
export type ElectionType = typeof valuesElectionType[number]

export interface BaseElectionDocument {
  id: string
  title: string
  description: string
  startsAt: Timestamp
  endsAt: Timestamp
  status: ElectionStatus
  createdAt: Timestamp
  updatedAt: Timestamp
  type: ElectionType
}

// 1. Coleção 'candidatos'
export type CandidatoDocument = {
  id: string
  nome: string
  partido: string
  dataNascimento: Timestamp
  isActive: boolean
  federacao?: string
}

// Subcoleção 'eleicoes/[eleicaoId]/candidatos'
export type VotosCandidatoDocument = {
  eleicaoId: string
  candidatoId: string
  votos: number
  numero: number
}

// 2. Coleção 'eleicoes'
export interface EleicaoDeputadoDocument extends BaseElectionDocument {
  type: 'deputy'
  uf: UF
  agremiacoes: string[] // Lista de partidos/federações válidos
  votosLegenda: Record<string, number> // {"NomeAgremiacao": quantidadeVotos}
  votosBrancos: number
  votosNulos: number
}

// Subcoleção 'resultados/consolidado' em 'eleicoes'
export interface ResultadoDeputadoConsolidadoDocument {
  votosValidos: number
  quocienteEleitoral: number
  apuradoEm: Timestamp
  agremiacoes: Array<{
    agremiacao: string
    votosNominais: number
    votosLegenda: number
    votosValidos: number
    quocientePartidario: number
    vagasQuociente: number
    vagasSobras: number
    eleitosIds: string[]
  }>
  eleitosIds: string[] // Lista apenas com os IDs dos candidatos eleitos
}

// 3. Coleção 'eleicoes'
export interface EleicaoPresidenteDocument extends BaseElectionDocument {
  type: 'president'
  turno: number
  votosBrancos: number
  votosNulos: number
}

// Subcoleção 'resultados/consolidado' em 'eleicoes'
export interface ResultadoPresidenteConsolidadoDocument {
  votosValidos: number
  precisaSegundoTurno: boolean
  apuradoEm: Timestamp
  candidatosVotacaoIds: string[] // IDs dos candidatos classificados
}

// 4. Coleção 'eleicoes'
export type LocalConsulta = 'Brasil' | UF // Por enquanto, apenas consultas nacionais ou estaduais

export interface ConsultaPublicaDocument extends BaseElectionDocument {
  type: 'public-consultation'
  local: LocalConsulta
  sim: number
  nao: number
}
