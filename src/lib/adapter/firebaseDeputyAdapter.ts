import { z } from 'zod'
import { Timestamp } from 'firebase/firestore'
import { EleicaoDeputado } from '@/interfaces/eleicaoInterfaces'
import { EleicaoDeputadoDocument, ElectionStatus } from '@/interfaces/firebaseInterfaces'
import { DatabaseAdapter } from './databaseInterface'
import { RawDocumentTimeToDate } from '../utils/date'
import { UF } from '../constants/election'

const DeputyRawSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  startsAt: z.union([z.instanceof(Timestamp), z.string()]),
  endsAt: z.union([z.instanceof(Timestamp), z.string()]),
  createdAt: z.union([z.instanceof(Timestamp), z.string()]),
  updatedAt: z.union([z.instanceof(Timestamp), z.string()]),
  type: z.literal('deputy'),
  uf: z.string(),
  agremiacoes: z.array(z.string()),
  votosLegenda: z.record(z.string(), z.number()).default({}),
  votosBrancos: z.number().default(0),
  votosNulos: z.number().default(0),
})

export type DeputyRawDocument = z.infer<typeof DeputyRawSchema>

class DeputyAdapter implements DatabaseAdapter<EleicaoDeputadoDocument, EleicaoDeputado, void, DeputyRawDocument> {
  fromDB(raw: DeputyRawDocument): EleicaoDeputado {
    const parsed = DeputyRawSchema.parse(raw)

    return {
      id: parsed.id,
      title: parsed.title,
      description: parsed.description,
      startsAt: RawDocumentTimeToDate(parsed.startsAt),
      endsAt: RawDocumentTimeToDate(parsed.endsAt),
      status: parsed.status as ElectionStatus,
      createdAt: RawDocumentTimeToDate(parsed.createdAt),
      updatedAt: RawDocumentTimeToDate(parsed.updatedAt),
      type: 'deputy',
      uf: parsed.uf as UF,
      agremiacoes: parsed.agremiacoes,
      candidatos: [], // Preenchido pelo repositório a partir da subcoleção
      votosLegenda: parsed.votosLegenda,
      votosBrancos: parsed.votosBrancos,
      votosNulos: parsed.votosNulos,
    }
  }

  toDB(domain: EleicaoDeputado): EleicaoDeputadoDocument {
    // Normaliza votosLegenda se vier como Map em vez de Record plano
    const votosLegendaObj = domain.votosLegenda instanceof Map
      ? Object.fromEntries(domain.votosLegenda)
      : (domain.votosLegenda || {})

    return {
      id: domain.id,
      title: domain.title,
      description: domain.description,
      startsAt: Timestamp.fromDate(domain.startsAt),
      endsAt: Timestamp.fromDate(domain.endsAt),
      status: domain.status,
      createdAt: Timestamp.fromDate(domain.createdAt),
      updatedAt: Timestamp.fromDate(domain.updatedAt),
      type: 'deputy',
      uf: domain.uf,
      agremiacoes: Array.from(domain.agremiacoes),
      votosLegenda: votosLegendaObj,
      votosBrancos: domain.votosBrancos,
      votosNulos: domain.votosNulos,
    }
  }
}

export const deputyAdapter = new DeputyAdapter()
