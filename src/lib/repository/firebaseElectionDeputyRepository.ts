import { Timestamp, doc, getDoc, serverTimestamp, collection, setDoc, updateDoc } from 'firebase/firestore'
import { firestore } from '../firebase'
import { getDateYearsAgo, isValidTimeFrame } from '../utils/date'
import { omitId } from '../utils/omitId'
import { EleicaoDeputado } from '@/interfaces/eleicaoInterfaces'
import { EleicaoDeputadoDocument } from '@/interfaces/firebaseInterfaces'
import { DeputyRawDocument, deputyAdapter } from '../adapter/firebaseDeputyAdapter'
import { firebaseVotesCandidate } from './firebaseVotesCandidateRepository'
import { ELECTION_COLLECTION } from './firebasePublicConsultationRepository'

/* Idade mínima para Deputado = 21 anos (art. 14, § 3º, VI, c da CF) */
export const MINIMUM_DEPUTY_AGE = 21
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
}

export const firebaseDeputy = new FirebaseDeputyRepository()
