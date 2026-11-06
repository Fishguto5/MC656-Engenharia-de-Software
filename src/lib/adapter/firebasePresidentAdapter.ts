import { z } from 'zod'
import { EleicaoPresidente } from '@/interfaces/eleicaoInterfaces'
import { EleicaoPresidenteDocument, ElectionStatus } from '@/interfaces/firebaseInterfaces'
import { DatabaseAdapter } from './databaseInterface'
import { Timestamp } from 'firebase/firestore'
import { RawDocumentTimeToDate } from '../utils/date'

const PresidentRawSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  startsAt: z.union([z.instanceof(Timestamp), z.string()]),
  endsAt: z.union([z.instanceof(Timestamp), z.string()]),
  createdAt: z.union([z.instanceof(Timestamp), z.string()]),
  updatedAt: z.union([z.instanceof(Timestamp), z.string()]),
  type: z.literal('president'),
  candidatosIds: z.array(z.string()),
  turno: z.number(),
  votosBrancos: z.number(),
  votosNulos: z.number(),
})

export type PresidentRawDocument = z.infer<typeof PresidentRawSchema>

class PresidentAdapter implements DatabaseAdapter<EleicaoPresidenteDocument, EleicaoPresidente, void, PresidentRawDocument> {
  fromDB(raw: PresidentRawDocument): EleicaoPresidente {
    const parsed = PresidentRawSchema.parse(raw)

    const startsAt = RawDocumentTimeToDate(parsed.startsAt)
    const endsAt = RawDocumentTimeToDate(parsed.endsAt)
    const createdAt = RawDocumentTimeToDate(parsed.createdAt)
    const updatedAt = RawDocumentTimeToDate(parsed.updatedAt)

    return {
      id: parsed.id,
      title: parsed.title,
      description: parsed.description,
      startsAt,
      endsAt,
      status: parsed.status as ElectionStatus,
      createdAt,
      updatedAt,
      type: 'president',
      candidatos: [], // O preenchimento dos detalhes dos candidatos é feito no repositório combinando com 'candidatosIds'
      turno: parsed.turno,
      votosBrancos: parsed.votosBrancos,
      votosNulos: parsed.votosNulos,
    }
  }

  toDB(domain: EleicaoPresidente): EleicaoPresidenteDocument {
    return {
      id: domain.id,
      title: domain.title,
      description: domain.description,
      startsAt: Timestamp.fromDate(domain.startsAt),
      endsAt: Timestamp.fromDate(domain.endsAt),
      status: domain.status,
      createdAt: Timestamp.fromDate(domain.createdAt),
      updatedAt: Timestamp.fromDate(domain.updatedAt),
      type: 'president',
      turno: domain.turno,
      votosBrancos: domain.votosBrancos,
      votosNulos: domain.votosNulos,
    }
  }
}

export const presidentAdapter = new PresidentAdapter()