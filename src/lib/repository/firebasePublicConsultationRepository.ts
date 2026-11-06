import { ConsultaPublica } from '@/interfaces/eleicaoInterfaces'
import { collection, doc, updateDoc, getDoc, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore'
import { firestore } from '../firebase'
import { publicConsultationAdapter, PublicConsultationRawDocument } from '../adapter/firebasePublicConsultationAdapter'
import { ConsultaPublicaDocument } from '@/interfaces/firebaseInterfaces'
import { omitId } from '../utils/omitId'
import { isValidTimeFrame } from '../utils/date'

export const ELECTION_COLLECTION = 'eleicoes'

class FirebasePublicConsultationRepository {
  // async findAll(): Promise<ConsultaPublica[]> {}

  async findById(id: string): Promise<ConsultaPublica | null> {
    const publicConsultationRef = doc(firestore, ELECTION_COLLECTION, id)
    const snapshot = await getDoc(publicConsultationRef)

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
    if (!isValidTimeFrame(dbData.startsAt, dbData.endsAt)) {
      return
    }

    // Criar data
    const data: Omit<ConsultaPublicaDocument, 'id'> = {
      ...omitId<ConsultaPublicaDocument>(dbData),
      createdAt: serverTimestamp() as unknown as Timestamp,
      updatedAt: serverTimestamp() as unknown as Timestamp,
    }

    try {
      await addDoc(collection(firestore, ELECTION_COLLECTION), data)
    }
    catch (error) {
      console.error('Erro ao criar consulta pública:', error)
      throw new Error('Não foi possível salvar a nova consulta pública.')
    }
  }

  async update(domain: ConsultaPublica): Promise<void> {
    const dbData = publicConsultationAdapter.toDB(domain)

    // Verificar Idade
    if (!isValidTimeFrame(dbData.startsAt, dbData.endsAt)) {
      return
    }

    const data: Omit<ConsultaPublicaDocument, 'id'> = {
      ...omitId<ConsultaPublicaDocument>(dbData),
      updatedAt: serverTimestamp() as unknown as Timestamp,
    }

    const publicConsultationRef = doc(firestore, ELECTION_COLLECTION, domain.id)

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
