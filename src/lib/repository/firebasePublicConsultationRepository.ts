import { ConsultaPublica } from '@/interfaces/eleicaoInterfaces'
import { collection, doc, updateDoc, getDoc, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore'
import { firestore } from '../firebase'
import { publicConsultationAdapter, PublicConsultationRawDocument } from '../adapter/firebasePublicConsultationAdapter'
import { ConsultaPublicaDocument } from '@/interfaces/firebaseInterfaces'
import { omitId } from '../utils/omitId'

export const PUBLIC_CONSULTATION_COLLECTION = 'eleicoes'

class FirebasePublicConsultationRepository {
  private isValidTimeFrame(start: Timestamp, end: Timestamp): boolean {
    const dateStart = start.toDate()
    dateStart.setHours(0, 0, 0, 0)

    const dateEnd = end.toDate()
    dateEnd.setHours(0, 0, 0, 0)

    // Garante que o dia de início é anterior ou igual ao dia de término
    return dateStart <= dateEnd
  }

  // async findAll(): Promise<ConsultaPublica[]> {}

  async findById(id: string): Promise<ConsultaPublica | null> {
    const candidateRef = doc(firestore, PUBLIC_CONSULTATION_COLLECTION, id)
    const snapshot = await getDoc(candidateRef)

    if (!snapshot.exists()) {
      return null
    }

    const rawData: PublicConsultationRawDocument = {
      id: snapshot.id,
      ...(snapshot.data() as Omit<PublicConsultationRawDocument, 'id'>),
    }

    try {
      return publicConsultationAdapter.fromDB(rawData)
    }
    catch (error) {
      console.error(`Consulta Publica com ID ${id} possui dados inválidos ou incompletos:`, error)
      return null
    }
  }

  async create(domain: ConsultaPublica): Promise<void> {
    const dbData = publicConsultationAdapter.toDB(domain)

    // Verificar data de inicio e fim
    if (!this.isValidTimeFrame(dbData.startsAt, dbData.endsAt)) {
      return
    }

    // Criar data
    const data: Omit<ConsultaPublicaDocument, 'id'> = {
      ...omitId<ConsultaPublicaDocument>(dbData),
      createdAt: serverTimestamp() as unknown as Timestamp,
      updatedAt: serverTimestamp() as unknown as Timestamp,
    }

    try {
      await addDoc(collection(firestore, PUBLIC_CONSULTATION_COLLECTION), data)
    }
    catch (error) {
      console.error('Erro ao criar consulta pública:', error)
      throw new Error('Não foi possível salvar a nova consulta pública.')
    }
  }

  async update(domain: ConsultaPublica): Promise<void> {
    const dbData = publicConsultationAdapter.toDB(domain)

    // Verificar Idade
    if (!this.isValidTimeFrame(dbData.startsAt, dbData.endsAt)) {
      return
    }

    const data: Omit<ConsultaPublicaDocument, 'id'> = {
      ...omitId<ConsultaPublicaDocument>(dbData),
      updatedAt: serverTimestamp() as unknown as Timestamp,
    }

    const publicConsultationRef = doc(firestore, PUBLIC_CONSULTATION_COLLECTION, domain.id)

    try {
      await updateDoc(publicConsultationRef, data)
    }
    catch (error) {
      console.error(`Erro ao atualizar a consulta pública com ID ${domain.id}:`, error)
      throw new Error(`Não foi possível atualizar os dados da consulta pública ${domain.id}.`)
    }
  }
}

export const firebasePublicConsultation = new FirebasePublicConsultationRepository()
