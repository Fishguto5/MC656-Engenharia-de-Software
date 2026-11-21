import { Timestamp, doc, getDoc, serverTimestamp, collection, setDoc, updateDoc, increment, runTransaction } from 'firebase/firestore'
import { firestore } from '../firebase'
import { getDateYearsAgo, isValidTimeFrame, RawDocumentTimeToDate } from '../utils/date'
import { omitId } from '../utils/omitId'
import { EleicaoDeputado, VotosCandidato } from '@/interfaces/eleicaoInterfaces'
import { ElectionStatus, EleicaoDeputadoDocument } from '@/interfaces/firebaseInterfaces'
import { DeputyRawDocument, deputyAdapter } from '../adapter/firebaseDeputyAdapter'
import { firebaseVotesCandidate } from './firebaseVotesCandidateRepository'
import { validateDraft } from '@/schemas/electionDraftSchema'
import { MINIMUM_DEPUTY_AGE, UF } from '../constants/election'
import { ELECTION_COLLECTION } from '../constants/firebase'
import { VotePayload } from './firebaseElectionFacade'

export const maxDeputyDoB = () => getDateYearsAgo(MINIMUM_DEPUTY_AGE)

type DeputyPayload = VotePayload & { type: 'deputy' }
type AgremiacoesResult = {
  agremiacoes: string[]
  votosLegenda: Record<string, number>
}

export class FirebaseDeputyRepository {
  private buildAgremiacoes(candidates: readonly VotosCandidato[]): AgremiacoesResult {
    const votosLegenda: Record<string, number> = {}

    for (const candidate of candidates) {
      const agremiacao = candidate.federacao?.trim() || candidate.partido.trim()

      if (agremiacao) {
        if (Object.hasOwn(votosLegenda, agremiacao)) {
          votosLegenda[agremiacao] += candidate.votos
        }
        else {
          votosLegenda[agremiacao] = candidate.votos
        }
      }
    }

    return {
      agremiacoes: Object.keys(votosLegenda),
      votosLegenda,
    }
  }

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

      // Cria as agremiações e votos por legenda
      const { agremiacoes, votosLegenda } = this.buildAgremiacoes(eleicao.candidatos)
      eleicao.agremiacoes = agremiacoes
      eleicao.votosLegenda = votosLegenda

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
      ...(hasValue(data.votosBrancos) && { votosBrancos: data.votosBrancos }),
      ...(hasValue(data.votosNulos) && { votosNulos: data.votosNulos }),
      ...(hasValue(data.startsAt) && { startsAt: RawDocumentTimeToDate(data.startsAt) }),
      ...(hasValue(data.endsAt) && { endsAt: RawDocumentTimeToDate(data.endsAt) }),
      ...(hasValue(data.createdAt) && { createdAt: RawDocumentTimeToDate(data.createdAt) }),
      ...(hasValue(data.updatedAt) && { updatedAt: RawDocumentTimeToDate(data.updatedAt) }),
      candidatos: [],
      agremiacoes: [],
      votosLegenda: {},
    }

    // Busca candidatos salvos na subcoleção de rascunho (se houver)
    const candidatos = await firebaseVotesCandidate.findByElectionId(id, ELECTION_COLLECTION)
    if (candidatos && candidatos.length > 0) {
      draft.candidatos = candidatos

      // Cria as agremiações e votos por legenda
      const { agremiacoes, votosLegenda } = this.buildAgremiacoes(draft.candidatos)
      draft.agremiacoes = agremiacoes
      draft.votosLegenda = votosLegenda
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

    const draftData: Record<string, unknown> = {
      title: domain.title ?? null,
      description: domain.description ?? null,
      startsAt: startsAtDate ? Timestamp.fromDate(startsAtDate) : null,
      endsAt: endsAtDate ? Timestamp.fromDate(endsAtDate) : null,
      status: 'draft',
      type: 'deputy',
      uf: domain.uf ?? null,
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

  async registerVote(id: string, domain: DeputyPayload): Promise<void> {
    const electionRef = doc(firestore, ELECTION_COLLECTION, id)

    try {
      await runTransaction(firestore, async (transaction) => {
        const snapshot = await transaction.get(electionRef)

        if (!snapshot.exists()) {
          throw new Error('Documento não encontrado.')
        }

        const electionData = snapshot.data()

        if (
          electionData?.type !== 'deputy'
          || typeof electionData?.votosBrancos !== 'number'
          || typeof electionData?.votosNulos !== 'number'
        ) {
          throw new Error('Documento inválido para eleição para deputado.')
        }

        // Voto em Branco
        if (domain.candidateNumber === 0) {
          transaction.update(electionRef, {
            votosBrancos: increment(1),
          })
          return
        }

        // Procura na subcoleção via repositório de votos e incrementa se existir
        const existCandidate = await firebaseVotesCandidate.incrementVoteInTransaction(
          transaction,
          id,
          ELECTION_COLLECTION,
          domain.candidateNumber,
        )

        // Voto Nulo (caso não exista candidato com o número informado)
        if (!existCandidate) {
          transaction.update(electionRef, {
            votosNulos: increment(1),
          })
        }
      })
    }
    catch (error) {
      console.error('Erro ao registrar voto:', error)
      throw error
    }
  }
}
