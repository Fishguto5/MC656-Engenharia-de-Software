import { z } from 'zod'
import { Candidato } from '@/interfaces/eleicaoInterfaces'
import { CandidatoDocument } from '@/interfaces/firebaseInterfaces'
import { DatabaseAdapter } from './databaseInterface'
import { Timestamp } from 'firebase/firestore'

// Apenas 'federacao' é opcional/nullable.
const candidatoRawSchema = z.object({
  id: z.string(),
  nome: z.string(), // Obrigatório
  partido: z.string(), // Obrigatório
  federacao: z.string().nullable().optional(), // Exceção (opcional)
  dataNascimento: z.union([z.instanceof(Timestamp), z.string()]), // Obrigatório
  isActive: z.boolean(), // Obrigatório
})

export type CandidatoRawDocument = z.infer<typeof candidatoRawSchema>

interface CandidateToDBOptions {
  isActive: boolean
}

class CandidateAdapter implements DatabaseAdapter<CandidatoDocument, Candidato, CandidateToDBOptions, CandidatoRawDocument> {
  fromDB(raw: CandidatoRawDocument): Candidato {
    const parsed = candidatoRawSchema.parse(raw) // Se faltar algum obrigatório, o Zod lança um erro

    let dataNascimentoDate = new Date()
    if (parsed.dataNascimento instanceof Timestamp) {
      dataNascimentoDate = parsed.dataNascimento.toDate()
    }
    else if (typeof parsed.dataNascimento === 'string') {
      dataNascimentoDate = new Date(parsed.dataNascimento)
    }

    return {
      id: parsed.id,
      nome: parsed.nome,
      partido: parsed.partido,
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
