import { z } from 'zod'
import { ConsultaPublica } from '@/interfaces/eleicaoInterfaces'
import { ConsultaPublicaDocument, ElectionStatus, LocalConsulta } from '@/interfaces/firebaseInterfaces'
import { DatabaseAdapter } from './databaseInterface'
import { Timestamp } from 'firebase/firestore'
import { RawDocumentTimeToDate } from '../utils/date'

const PublicConsultationRawSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  startsAt: z.union([z.instanceof(Timestamp), z.string()]),
  endsAt: z.union([z.instanceof(Timestamp), z.string()]),
  createdAt: z.union([z.instanceof(Timestamp), z.string()]),
  updatedAt: z.union([z.instanceof(Timestamp), z.string()]),
  type: z.string(),
  local: z.string(),
  sim: z.number(),
  nao: z.number(),
})

export type PublicConsultationRawDocument = z.infer<typeof PublicConsultationRawSchema>

class PublicConsultationAdapter implements DatabaseAdapter<ConsultaPublicaDocument, ConsultaPublica, void, PublicConsultationRawDocument> {
  fromDB(raw: PublicConsultationRawDocument): ConsultaPublica {
    const parsed = PublicConsultationRawSchema.parse(raw) // Se faltar algum obrigatório, o Zod lança um erro

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
      status: parsed.status as ElectionStatus, // Cast para o tipo enum/union esperado se no banco vier string
      createdAt,
      updatedAt,
      type: 'public-consultation',
      local: parsed.local as LocalConsulta, // Cast para o tipo esperado de LocalConsulta
      sim: parsed.sim,
      nao: parsed.nao,
    }
  }

  toDB(domain: ConsultaPublica): ConsultaPublicaDocument {
    return {
      id: domain.id,
      title: domain.title,
      description: domain.description,
      startsAt: Timestamp.fromDate(domain.startsAt),
      endsAt: Timestamp.fromDate(domain.endsAt),
      status: domain.status,
      createdAt: Timestamp.fromDate(domain.createdAt),
      updatedAt: Timestamp.fromDate(domain.updatedAt),
      type: domain.type,
      local: domain.local,
      sim: domain.sim,
      nao: domain.nao,
    }
  }
}

export const publicConsultationAdapter = new PublicConsultationAdapter()
