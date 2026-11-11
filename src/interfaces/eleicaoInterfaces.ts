import { ElectionType, UF } from '@/lib/constants/election'
import { ElectionStatus, LocalConsulta } from './firebaseInterfaces'

// Candidato
export interface Candidato {
  id: string
  nome: string
  partido: string
  // Usada apenas nos critérios de desempate por idade ("mais idoso").
  dataNascimento: Date
  // Federação partidária do candidato. Nas eleições proporcionais a federação
  // atua como um único partido (Lei 9.504/97, art. 6º-A).
  federacao?: string
}

export interface VotosCandidato extends Candidato {
  votos: number
  numero: number
}

// Eleição
export interface BaseElection {
  id: string
  title: string
  description: string
  startsAt: Date
  endsAt: Date
  status: ElectionStatus
  createdAt: Date
  updatedAt: Date
  type: ElectionType
}

// Eleição Deputado
export type VotosLegenda = Record<string, number>

export interface EleicaoDeputado extends BaseElection {
  id: string
  uf: UF
  agremiacoes: readonly string[]
  candidatos: VotosCandidato[]
  votosLegenda: VotosLegenda | ReadonlyMap<string, number>
  votosBrancos: number
  votosNulos: number
  type: 'deputy'
}

export interface ResultadoAgremiacao {
  agremiacao: string
  votosNominais: number
  votosLegenda: number
  votosValidos: number
  quocientePartidario: number
  vagasQuociente: number
  vagasSobras: number
  eleitos: VotosCandidato[]
}

export interface ResultadoDeputado {
  votosValidos: number
  quocienteEleitoral: number
  agremiacoes: ResultadoAgremiacao[]
  eleitos: VotosCandidato[]
}

// Eleição Presidente
export interface EleicaoPresidente extends BaseElection {
  type: 'president'
  candidatos: VotosCandidato[]
  turno: number
  votosBrancos: number
  votosNulos: number
}

export interface ResultadoPresidente {
  votosValidos: number
  precisaSegundoTurno: boolean
  apuradoEm: Date
  candidatosVotacao: VotosCandidato[]
}

// Consulta Pública
export interface ConsultaPublica extends BaseElection {
  type: 'public-consultation'
  local: LocalConsulta
  sim: number
  nao: number
}
