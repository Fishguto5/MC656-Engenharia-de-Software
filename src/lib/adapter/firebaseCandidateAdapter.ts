import { Timestamp } from 'firebase/firestore'
import { Candidato } from '@/interfaces/eleicaoInterfaces'
import { CandidatoDocument } from '@/interfaces/firebaseInterfaces'
import { DatabaseAdapter } from './databaseInterface'

interface CandidateToDBOptions {
  isActive: boolean
}

export class CandidateAdapter implements DatabaseAdapter<CandidatoDocument, Candidato, CandidateToDBOptions> {
  fromDB(raw: CandidatoDocument): Candidato {
    return {
      id: raw.id,
      nome: raw.nome,
      partido: raw.partido,
      federacao: raw.federacao ?? undefined,
      dataNascimento: raw.dataNascimento.toDate(),
    }
  }

  toDB(domain: Candidato, options?: CandidateToDBOptions): CandidatoDocument {
    return {
      id: domain.id,
      nome: domain.nome,
      partido: domain.partido,
      federacao: domain.federacao ?? undefined,
      dataNascimento: Timestamp.fromDate(domain.dataNascimento),
      isActive: options?.isActive ?? true,
    }
  }
}

export const candidateAdapter = new CandidateAdapter()
