import { ElectionStatus } from "./firebaseInterfaces"

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
}


