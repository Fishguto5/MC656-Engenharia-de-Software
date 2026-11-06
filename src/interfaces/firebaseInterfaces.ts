import { UF } from '@/lib/deputado'
import { Timestamp } from '@firebase/firestore'

// Interface Base da eleição
export type ElectionStatus = 'draft' | 'scheduled' | 'open' | 'closed' | 'cancelled'
export type ElectionType = 'president' | 'deputy' | 'public-consultation'

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

// Subcoleção de Votos para Candidato
export type VotosCandidatoDocument = {
  eleicaoId: string
  candidatoId: string
  votos: number
  numero: number
}

// 2. Coleção 'eleicoesDeputados'
export interface EleicaoDeputadoDocument extends BaseElectionDocument {
  type: 'deputy'
  uf: UF
  candidatosIds: string[] // Lista de IDs de candidatos concorrendo nesta uf
  agremiacoes: string[] // Lista de partidos/federações válidos
  votosLegenda: Record<string, number> // {"NomeAgremiacao": quantidadeVotos}
  votosBrancos: number
  votosNulos: number
}

// Subcoleção 'resultados/consolidado' em 'eleicoesDeputados'
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

// 3. Coleção 'eleicoesPresidente'
export interface EleicaoPresidenteDocument extends BaseElectionDocument {
  type: 'president'
  candidatosIds: string[]
  turno: number
  votosBrancos: number
  votosNulos: number
}

// Subcoleção 'resultados/consolidado' em 'eleicoesPresidente'
export interface ResultadoPresidenteConsolidadoDocument {
  votosValidos: number
  precisaSegundoTurno: boolean
  apuradoEm: Timestamp
  candidatosVotacaoIds: string[] // IDs dos candidatos classificados
}

// 4. Coleção 'consultasPublicas'
export type LocalConsulta = 'Brasil' | string

export interface ConsultaPublicaDocument extends BaseElectionDocument {
  type: 'public-consultation'
  local: LocalConsulta
  sim: number
  nao: number
}
