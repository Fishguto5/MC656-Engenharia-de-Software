import { ConsultaPublica } from '@/interfaces/eleicaoInterfaces'
import { collection, doc, updateDoc, getDoc, addDoc, Timestamp, serverTimestamp, setDoc } from 'firebase/firestore'
import { firestore } from '../firebase'
import { publicConsultationAdapter, PublicConsultationRawDocument } from '../adapter/firebasePublicConsultationAdapter'
import { ConsultaPublicaDocument, ElectionStatus, LocalConsulta } from '@/interfaces/firebaseInterfaces'
import { omitId } from '../utils/omitId'
import { isValidTimeFrame, RawDocumentTimeToDate } from '../utils/date'
import { validateDraft } from '@/schemas/electionDraftSchema'
import { ELECTION_COLLECTION } from '../constants/firebase'

export class FirebasePublicConsultationRepository {
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

  async findDraftById(id: string): Promise<Partial<ConsultaPublica> | null> {
    const publicConsultationRef = doc(firestore, ELECTION_COLLECTION, id)
    const snapshot = await getDoc(publicConsultationRef)

    if (!snapshot.exists()) {
      return null
    }

    const data = snapshot.data()

    // Helper para verificar se o valor é válido (não é null, undefined nem string vazia)
    const hasValue = (val: unknown): boolean => {
      return val !== null && val !== undefined && val !== ''
    }

    const draft: Partial<ConsultaPublica> = {
      id: snapshot.id,
      ...(hasValue(data.title) && { title: data.title }),
      ...(hasValue(data.description) && { description: data.description }),
      ...(hasValue(data.status) && { status: data.status as ElectionStatus }),
      ...(hasValue(data.type) && { type: data.type }),
      ...(hasValue(data.local) && { local: data.local as LocalConsulta }),
      ...(hasValue(data.sim) && { sim: data.sim }),
      ...(hasValue(data.nao) && { nao: data.nao }),
      ...(hasValue(data.startsAt) && { startsAt: RawDocumentTimeToDate(data.startsAt) }),
      ...(hasValue(data.endsAt) && { endsAt: RawDocumentTimeToDate(data.endsAt) }),
      ...(hasValue(data.createdAt) && { createdAt: RawDocumentTimeToDate(data.createdAt) }),
      ...(hasValue(data.updatedAt) && { updatedAt: RawDocumentTimeToDate(data.updatedAt) }),
    }

    return draft
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
      title: domain.title ?? null,
      description: domain.description ?? null,
      startsAt: startsAtDate ? Timestamp.fromDate(startsAtDate) : null,
      endsAt: endsAtDate ? Timestamp.fromDate(endsAtDate) : null,
      status: 'draft',
      type: 'public-consultation',
      local: domain.local ?? null,
      sim: domain.sim ?? 0,
      nao: domain.nao ?? 0,
      updatedAt: serverTimestamp(),
    }

    if (!draftId) {
      draftData.createdAt = serverTimestamp()
    }

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
