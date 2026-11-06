import { z } from 'zod'
import { Timestamp } from 'firebase/firestore'
import { VotosCandidato } from '@/interfaces/eleicaoInterfaces'
import { VotosCandidatoDocument } from '@/interfaces/firebaseInterfaces'
import { DatabaseAdapter } from './databaseInterface'
import { RawDocumentTimeToDate } from '../utils/date'

// Schema Zod para validar e parsear dados vindos do banco/raw
const VotosCandidatoRawSchema = z.object({
  id: z.string().optional(),
  eleicaoId: z.string(),
  candidatoId: z.string(),
  nome: z.string().default(''),
  partido: z.string().default(''),
  // Aceita Timestamp do Firestore, Date ou string ISO
  dataNascimento: z.union([z.instanceof(Timestamp), z.instanceof(Date), z.string()]),
  federacao: z.string().optional(),
  votos: z.number().default(0),
  numero: z.number().default(0),
})

export type VotosCandidatoRawDocument = z.infer<typeof VotosCandidatoRawSchema>

interface ToDBOptions {
  eleicaoId: string
}

class VotosCandidatoAdapter implements DatabaseAdapter<
  VotosCandidatoDocument,
  VotosCandidato,
  ToDBOptions,
  VotosCandidatoRawDocument
> {
  fromDB(raw: VotosCandidatoRawDocument): VotosCandidato {
    const parsed = VotosCandidatoRawSchema.parse(raw)

    // Garantir que dataNascimento seja SEMPRE um objeto Date válido no domínio
    const dataNascimento: Date = RawDocumentTimeToDate(parsed.dataNascimento)

    return {
      id: parsed.candidatoId || parsed.id || '',
      nome: parsed.nome,
      partido: parsed.partido,
      dataNascimento,
      federacao: parsed.federacao,
      votos: parsed.votos,
      numero: parsed.numero,
    }
  }

  toDB(domain: VotosCandidato, options?: ToDBOptions): VotosCandidatoDocument {
    if (!options?.eleicaoId) {
      throw new Error('O parâmetro eleicaoId é obrigatório em TOptions para persistir VotosCandidato.')
    }

    return {
      eleicaoId: options.eleicaoId,
      candidatoId: domain.id,
      votos: domain.votos,
      numero: domain.numero,
    }
  }
}

export const votesCandidateAdapter = new VotosCandidatoAdapter()
