import { ElectionStatus, EleicaoPresidenteDocument } from '@/interfaces/firebaseInterfaces'
import { Timestamp, doc, getDoc, serverTimestamp, collection, setDoc, updateDoc } from 'firebase/firestore'
import { firestore } from '../firebase'
import { getDateYearsAgo, isValidTimeFrame, RawDocumentTimeToDate } from '../utils/date'
import { omitId } from '../utils/omitId'
import { EleicaoPresidente } from '@/interfaces/eleicaoInterfaces'
import { PresidentRawDocument, presidentAdapter } from '../adapter/firebasePresidentAdapter'
import { firebaseVotesCandidate } from './firebaseVotesCandidateRepository'
import { validateDraft } from '@/schemas/electionDraftSchema'
import { MINIMUM_PRESIDENT_AGE } from '../constants/election'
import { ELECTION_COLLECTION } from '../constants/firebase'

export const maxPresidentDoB = () => {
  return getDateYearsAgo(MINIMUM_PRESIDENT_AGE)
}

export class FirebasePresidentRepository {
  async findById(id: string): Promise<EleicaoPresidente | null> {
    const presidentRef = doc(firestore, ELECTION_COLLECTION, id)
    const snapshot = await getDoc(presidentRef)

    if (!snapshot.exists()) {
      return null
    }

    const rawData: PresidentRawDocument = {
      id: snapshot.id,
      ...(snapshot.data() as Omit<PresidentRawDocument, 'id'>),
    }

    try {
      const eleicao = presidentAdapter.fromDB(rawData)

      // Busca os candidatos correspondentes na subcoleção usando ELECTION_COLLECTION
      eleicao.candidatos = await firebaseVotesCandidate.findByElectionId(id, ELECTION_COLLECTION)

      return eleicao
    }
    catch (error) {
      console.error(`Eleição para presidente com ID ${id} possui dados inválidos ou incompletos:`, error)
      return null
    }
  }

  async findDraftById(id: string): Promise<Partial<EleicaoPresidente> | null> {
    const presidentRef = doc(firestore, ELECTION_COLLECTION, id)
    const snapshot = await getDoc(presidentRef)

    if (!snapshot.exists()) {
      return null
    }

    const data = snapshot.data()

    // Helper para verificar se o valor está preenchido
    const hasValue = (val: unknown): boolean => {
      return val !== null && val !== undefined && val !== ''
    }

    const draft: Partial<EleicaoPresidente> = {
      id: snapshot.id,
      ...(hasValue(data.title) && { title: data.title }),
      ...(hasValue(data.description) && { description: data.description }),
      ...(hasValue(data.status) && { status: data.status as ElectionStatus }),
      ...(hasValue(data.type) && { type: data.type }),
      ...(hasValue(data.turno) && { turno: data.turno }),
      ...(hasValue(data.votosBrancos) && { votosBrancos: data.votosBrancos }),
      ...(hasValue(data.votosNulos) && { votosNulos: data.votosNulos }),
      ...(hasValue(data.startsAt) && { startsAt: RawDocumentTimeToDate(data.startsAt) }),
      ...(hasValue(data.endsAt) && { endsAt: RawDocumentTimeToDate(data.endsAt) }),
      ...(hasValue(data.createdAt) && { createdAt: RawDocumentTimeToDate(data.createdAt) }),
      ...(hasValue(data.updatedAt) && { updatedAt: RawDocumentTimeToDate(data.updatedAt) }),
      candidatos: [],
    }

    // Busca candidatos salvos na subcoleção do rascunho (se houver)
    const candidatos = await firebaseVotesCandidate.findByElectionId(id, ELECTION_COLLECTION)
    if (candidatos && candidatos.length > 0) {
      draft.candidatos = candidatos
    }

    return draft
  }

  async create(domain: EleicaoPresidente): Promise<void> {
    const dbData = presidentAdapter.toDB(domain)

    if (!isValidTimeFrame(dbData.startsAt, dbData.endsAt)) {
      return
    }

    const data: Omit<EleicaoPresidenteDocument, 'id'> = {
      ...omitId<EleicaoPresidenteDocument>(dbData),
      createdAt: serverTimestamp() as unknown as Timestamp,
      updatedAt: serverTimestamp() as unknown as Timestamp,
    }

    try {
      // 1. Cria uma referência válida com ID gerado automaticamente na ELECTION_COLLECTION
      const electionRef = doc(collection(firestore, ELECTION_COLLECTION))
      const generatedId = electionRef.id

      // 2. Salva o documento principal da eleição
      await setDoc(electionRef, data)

      // 3. Salva os candidatos na subcoleção associada
      if (domain.candidatos && domain.candidatos.length > 0) {
        await firebaseVotesCandidate.saveBatch(
          generatedId,
          ELECTION_COLLECTION,
          domain.candidatos,
        )
      }
    }
    catch (error) {
      console.error('Erro ao criar Eleição para presidente:', error)
      throw new Error('Não foi possível salvar a nova Eleição para presidente.')
    }
  }

  async update(domain: EleicaoPresidente): Promise<void> {
    const dbData = presidentAdapter.toDB(domain)

    if (!isValidTimeFrame(dbData.startsAt, dbData.endsAt)) {
      return
    }

    const data: Omit<EleicaoPresidenteDocument, 'id'> = {
      ...omitId<EleicaoPresidenteDocument>(dbData),
      updatedAt: serverTimestamp() as unknown as Timestamp,
    }

    const electionRef = doc(firestore, ELECTION_COLLECTION, domain.id)

    try {
      await updateDoc(electionRef, data)

      if (domain.candidatos && domain.candidatos.length > 0) {
        await firebaseVotesCandidate.saveBatch(
          domain.id,
          ELECTION_COLLECTION,
          domain.candidatos,
        )
      }
    }
    catch (error) {
      console.error(`Erro ao atualizar a Eleição para presidente com ID ${domain.id}:`, error)
      throw new Error(`Não foi possível atualizar os dados da Eleição para presidente ${domain.id}.`)
    }
  }

  async saveDraft(draftId: string | null, domain: Partial<EleicaoPresidente>): Promise<string> {
    const startsAtDate = domain.startsAt ? RawDocumentTimeToDate(domain.startsAt) : undefined
    const endsAtDate = domain.endsAt ? RawDocumentTimeToDate(domain.endsAt) : undefined

    const sanitizedCandidates = domain.candidatos
      ? domain.candidatos.map(candidate => ({
          ...candidate,
          dataNascimento: RawDocumentTimeToDate(candidate.dataNascimento),
          votos: candidate.votos ?? 0,
        }))
      : undefined

    const errorMsg = validateDraft('president', {
      startsAt: startsAtDate,
      endsAt: endsAtDate,
      candidates: sanitizedCandidates,
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
      type: 'president',
      turno: domain.turno ?? 1,
      votosBrancos: domain.votosBrancos ?? 0,
      votosNulos: domain.votosNulos ?? 0,
      updatedAt: serverTimestamp(),
    }

    if (!draftId) {
      draftData.createdAt = serverTimestamp()
    }

    try {
      await setDoc(docRef, draftData, { merge: true })

      if (sanitizedCandidates && sanitizedCandidates.length > 0) {
        await firebaseVotesCandidate.saveBatch(
          currentId,
          ELECTION_COLLECTION,
          sanitizedCandidates,
        )
      }

      return currentId
    }
    catch (error) {
      console.error('Erro ao salvar rascunho de eleição para presidente:', error)
      throw error
    }
  }
}
