import { ConsultaPublica } from '@/interfaces/eleicaoInterfaces'
import { collection, doc, updateDoc, getDoc, addDoc, Timestamp, serverTimestamp, setDoc } from 'firebase/firestore'
import { firestore } from '../firebase'
import { publicConsultationAdapter, PublicConsultationRawDocument } from '../adapter/firebasePublicConsultationAdapter'
import { ConsultaPublicaDocument } from '@/interfaces/firebaseInterfaces'
import { omitId } from '../utils/omitId'
import { isValidTimeFrame, RawDocumentTimeToDate } from '../utils/date'
import { validateDraft } from '@/interfaces/electionDraftSchema'

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

  async saveDraft(draftId: string | null, domain: Partial<ConsultaPublica>): Promise<string> {
    const startsAtDate = domain.startsAt ? RawDocumentTimeToDate(domain.startsAt) : undefined
    const endsAtDate = domain.endsAt ? RawDocumentTimeToDate(domain.endsAt) : undefined

    const errorMsg = validateDraft('public-consultation', {
      startsAt: startsAtDate,
      endsAt: endsAtDate,
    })

    if (errorMsg) {
      throw new Error(errorMsg)
    }

    const docRef = draftId
      ? doc(firestore, ELECTION_COLLECTION, draftId)
      : doc(collection(firestore, ELECTION_COLLECTION))

    const currentId = docRef.id

    const draftData: Record<string, unknown> = {
      status: 'draft',
      type: 'public-consultation',
      sim: domain.sim ?? 0,
      nao: domain.nao ?? 0,
      updatedAt: serverTimestamp(),
    }

    if (!draftId) {
      draftData.createdAt = serverTimestamp()
    }

    if (domain.title !== undefined) draftData.title = domain.title
    if (domain.description !== undefined) draftData.description = domain.description
    if (startsAtDate !== undefined) draftData.startsAt = Timestamp.fromDate(startsAtDate)
    if (endsAtDate !== undefined) draftData.endsAt = Timestamp.fromDate(endsAtDate)
    if (domain.local !== undefined) draftData.local = domain.local

    try {
      await setDoc(docRef, draftData, { merge: true })
      return currentId
    }
    catch (error) {
      console.error('Erro ao salvar rascunho de consulta pública:', error)
      throw error
    }
  }
}

export const firebasePublicConsultation = new FirebasePublicConsultationRepository()
