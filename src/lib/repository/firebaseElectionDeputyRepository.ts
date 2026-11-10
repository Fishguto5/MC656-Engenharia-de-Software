import { Timestamp, doc, getDoc, serverTimestamp, collection, setDoc, updateDoc } from 'firebase/firestore'
import { firestore } from '../firebase'
import { getDateYearsAgo, isValidTimeFrame, RawDocumentTimeToDate } from '../utils/date'
import { omitId } from '../utils/omitId'
import { EleicaoDeputado } from '@/interfaces/eleicaoInterfaces'
import { ElectionStatus, EleicaoDeputadoDocument } from '@/interfaces/firebaseInterfaces'
import { DeputyRawDocument, deputyAdapter } from '../adapter/firebaseDeputyAdapter'
import { firebaseVotesCandidate } from './firebaseVotesCandidateRepository'
import { validateDraft } from '@/schemas/electionDraftSchema'
import { ELECTION_COLLECTION, MINIMUM_DEPUTY_AGE } from '../constants/election'
import { UF } from '../deputado'

export const maxDeputyDoB = () => getDateYearsAgo(MINIMUM_DEPUTY_AGE)

class FirebaseDeputyRepository {
  async findById(id: string): Promise<EleicaoDeputado | null> {
    const deputyRef = doc(firestore, ELECTION_COLLECTION, id)
    const snapshot = await getDoc(deputyRef)

    if (!snapshot.exists()) {
      return null
    }

    const rawData: DeputyRawDocument = {
      id: snapshot.id,
      ...(snapshot.data() as Omit<DeputyRawDocument, 'id'>),
    }

    try {
      const eleicao = deputyAdapter.fromDB(rawData)

      // Popula a subcoleção de candidatos da eleição
      eleicao.candidatos = await firebaseVotesCandidate.findByElectionId(id, ELECTION_COLLECTION)

      return eleicao
    }
    catch (error) {
      console.error(`Eleição para deputado com ID ${id} possui dados inválidos:`, error)
      return null
    }
  }

  async findDraftById(id: string): Promise<Partial<EleicaoDeputado> | null> {
    const deputyRef = doc(firestore, ELECTION_COLLECTION, id)
    const snapshot = await getDoc(deputyRef)

    if (!snapshot.exists()) {
      return null
    }

    const data = snapshot.data()

    // Helper para verificar se o valor está preenchido
    const hasValue = (val: unknown): boolean => {
      return val !== null && val !== undefined && val !== ''
    }

    const draft: Partial<EleicaoDeputado> = {
      id: snapshot.id,
      ...(hasValue(data.title) && { title: data.title }),
      ...(hasValue(data.description) && { description: data.description }),
      ...(hasValue(data.status) && { status: data.status as ElectionStatus }),
      ...(hasValue(data.type) && { type: data.type }),
      ...(hasValue(data.uf) && { uf: data.uf as UF }),
      ...(hasValue(data.agremiacoes) && { agremiacoes: data.agremiacoes }),
      ...(hasValue(data.votosLegenda) && { votosLegenda: data.votosLegenda }),
      ...(hasValue(data.votosBrancos) && { votosBrancos: data.votosBrancos }),
      ...(hasValue(data.votosNulos) && { votosNulos: data.votosNulos }),
      ...(hasValue(data.startsAt) && { startsAt: RawDocumentTimeToDate(data.startsAt) }),
      ...(hasValue(data.endsAt) && { endsAt: RawDocumentTimeToDate(data.endsAt) }),
      ...(hasValue(data.createdAt) && { createdAt: RawDocumentTimeToDate(data.createdAt) }),
      ...(hasValue(data.updatedAt) && { updatedAt: RawDocumentTimeToDate(data.updatedAt) }),
      candidatos: [],
    }

    // Busca candidatos salvos na subcoleção de rascunho (se houver)
    const candidatos = await firebaseVotesCandidate.findByElectionId(id, ELECTION_COLLECTION)
    if (candidatos && candidatos.length > 0) {
      draft.candidatos = candidatos
    }

    return draft
  }

  async create(domain: EleicaoDeputado): Promise<void> {
    const dbData = deputyAdapter.toDB(domain)

    if (!isValidTimeFrame(dbData.startsAt, dbData.endsAt)) {
      throw new Error('A data final deve ser posterior à data inicial.')
    }

    const data: Omit<EleicaoDeputadoDocument, 'id'> = {
      ...omitId<EleicaoDeputadoDocument>(dbData),
      createdAt: serverTimestamp() as unknown as Timestamp,
      updatedAt: serverTimestamp() as unknown as Timestamp,
    }

    try {
      // 1. Gera ID automático via coleção para evitar erros de segmento no Firestore
      const electionRef = doc(collection(firestore, ELECTION_COLLECTION))
      const generatedId = electionRef.id

      // 2. Salva o documento da eleição de deputado
      await setDoc(electionRef, data)

      // 3. Salva a subcoleção de candidatos associada
      if (domain.candidatos && domain.candidatos.length > 0) {
        await firebaseVotesCandidate.saveBatch(
          generatedId,
          ELECTION_COLLECTION,
          domain.candidatos,
        )
      }
    }
    catch (error) {
      console.error('Erro ao criar Eleição para deputado:', error)
      throw new Error('Não foi possível salvar a nova Eleição para deputado.')
    }
  }

  async update(domain: EleicaoDeputado): Promise<void> {
    const dbData = deputyAdapter.toDB(domain)

    if (!isValidTimeFrame(dbData.startsAt, dbData.endsAt)) {
      throw new Error('A data final deve ser posterior à data inicial.')
    }

    const data: Omit<EleicaoDeputadoDocument, 'id'> = {
      ...omitId<EleicaoDeputadoDocument>(dbData),
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
      console.error(`Erro ao atualizar a Eleição para deputado ${domain.id}:`, error)
      throw new Error(`Não foi possível atualizar a Eleição para deputado ${domain.id}.`)
    }
  }

  async saveDraft(draftId: string | null, domain: Partial<EleicaoDeputado>): Promise<string> {
    const startsAtDate = domain.startsAt ? RawDocumentTimeToDate(domain.startsAt) : undefined
    const endsAtDate = domain.endsAt ? RawDocumentTimeToDate(domain.endsAt) : undefined

    const sanitizedCandidates = domain.candidatos
      ? domain.candidatos.map(candidate => ({
          ...candidate,
          dataNascimento: RawDocumentTimeToDate(candidate.dataNascimento),
          votos: candidate.votos ?? 0,
        }))
      : undefined

    const errorMsg = validateDraft('deputy', {
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

    const agremiacoesSet = new Set<string>()
    const votosLegendaInicial: Record<string, number> = {}

    if (sanitizedCandidates && sanitizedCandidates.length > 0) {
      sanitizedCandidates.forEach((candidate) => {
        const agremiacao = candidate.federacao?.trim() || candidate.partido.trim()
        if (agremiacao) {
          agremiacoesSet.add(agremiacao)
          votosLegendaInicial[agremiacao] = 0
        }
      })
    }

    const draftData: Record<string, unknown> = {
      title: domain.title ?? null,
      description: domain.description ?? null,
      startsAt: startsAtDate ? Timestamp.fromDate(startsAtDate) : null,
      endsAt: endsAtDate ? Timestamp.fromDate(endsAtDate) : null,
      status: 'draft',
      type: 'deputy',
      uf: domain.uf ?? null,
      agremiacoes: Array.from(agremiacoesSet),
      votosLegenda: domain.votosLegenda ?? votosLegendaInicial,
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
      console.error('Erro ao salvar rascunho de eleição para deputado:', error)
      throw error
    }
  }
}

export const firebaseDeputy = new FirebaseDeputyRepository()
