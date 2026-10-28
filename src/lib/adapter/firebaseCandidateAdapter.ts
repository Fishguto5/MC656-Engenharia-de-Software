import { z } from 'zod'
import { Candidato } from '@/interfaces/eleicaoInterfaces'
import { CandidatoDocument } from '@/interfaces/firebaseInterfaces'
import { DatabaseAdapter } from './databaseInterface'
import { Timestamp } from 'firebase/firestore'

// Schema do Zod para o dado bruto do Firebase
const candidatoRawSchema = z.object({
  id: z.string(),
  nome: z.string().nullable().optional(),
  partido: z.string().nullable().optional(),
  federacao: z.string().nullable().optional(),
  dataNascimento: z.union([z.instanceof(Timestamp), z.string(), z.null()]).optional(),
  isActive: z.boolean().nullable().optional(),
})

// tipo bruto automaticamente do Zod
export type CandidatoRawDocument = z.infer<typeof candidatoRawSchema>

interface CandidateToDBOptions {
  isActive: boolean
}

class CandidateAdapter implements DatabaseAdapter<CandidatoDocument, Candidato, CandidateToDBOptions, CandidatoRawDocument> {
  fromDB(raw: CandidatoRawDocument): Candidato {
    const parsed = candidatoRawSchema.parse(raw)

    let dataNascimentoDate = new Date()
    if (parsed.dataNascimento instanceof Timestamp) {
      dataNascimentoDate = parsed.dataNascimento.toDate()
    }
    else if (typeof parsed.dataNascimento === 'string') {
      dataNascimentoDate = new Date(parsed.dataNascimento)
    }

    return {
      id: parsed.id,
      nome: parsed.nome ?? 'Nome não informado',
      partido: parsed.partido ?? 'Partido não informado',
      federacao: parsed.federacao ?? undefined,
      dataNascimento: dataNascimentoDate,
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
