import { Candidato } from '@/interfaces/eleicaoInterfaces'
import { QuerySnapshot, query, collection, orderBy, getDocs, where, doc, updateDoc, getDoc, addDoc, QueryDocumentSnapshot, DocumentData, writeBatch, Timestamp, documentId } from 'firebase/firestore'
import { candidateAdapter, CandidatoRawDocument } from '../adapter/firebaseCandidateAdapter'
import { firestore } from '../firebase'
import { getDateYearsAgo } from '../utils/date'
import { MINIMUM_DEPUTY_AGE } from './firebaseElectionDeputyRepository'
import { CandidatoDocument } from '@/interfaces/firebaseInterfaces'
import { omitId } from '../utils/omitId'

export const CANDIDATES_COLLECTION = 'candidatos'

/* Idade mínima para Deputado = 21 anos
 * Idade mínima para Presidente = 35 anos
 * A lógica de eleição verifica a idade para presidente
*/
export const MINIMUM_AGE = MINIMUM_DEPUTY_AGE
export const maxCandidateDoB = () => {
  return getDateYearsAgo(MINIMUM_AGE)
}

class FirebaseCandidatesRepository {
  private mapSnapshotToCandidates(snapshot: QuerySnapshot): Candidato[] {
    return snapshot.docs.flatMap((documento: QueryDocumentSnapshot<DocumentData>) => {
      const rawData: CandidatoRawDocument = {
        id: documento.id,
        ...(documento.data() as Omit<CandidatoRawDocument, 'id'>),
      }

      try {
        const candidato = candidateAdapter.fromDB(rawData)
        return candidato ? [candidato] : []
      }
      catch (error) {
        console.error(`Erro ao validar/converter candidato ID ${documento.id}:`, error)
        return [] // Ignora o registro inválido/incompleto automaticamente
      }
    })
  }

  private isValidaDoB(DoB: Timestamp): boolean {
    // Converte o Timestamp e zera o horário (00:00:00.000)
    const candidateDate = DoB.toDate()
    candidateDate.setHours(0, 0, 0, 0)

    // Obtém a data máxima permitida e também zera o horário
    const maxDate = new Date(`${maxCandidateDoB()}T00:00:00`)
    maxDate.setHours(0, 0, 0, 0)

    return candidateDate <= maxDate
  }

  async findAll(): Promise<Candidato[]> {
    const candidatesQuery = query(
      collection(firestore, CANDIDATES_COLLECTION),
      orderBy('partido', 'asc'),
    )

    const snapshot = await getDocs(candidatesQuery)

    return this.mapSnapshotToCandidates(snapshot)
  }

  async findAllActive(): Promise<Candidato[]> {
    const candidatesQuery = query(
      collection(firestore, CANDIDATES_COLLECTION),
      where('isActive', '==', true),
      orderBy('partido', 'asc'),
    )

    const snapshot = await getDocs(candidatesQuery)

    return this.mapSnapshotToCandidates(snapshot)
  }

  async findById(id: string): Promise<Candidato | null> {
    const candidateRef = doc(firestore, CANDIDATES_COLLECTION, id)
    const snapshot = await getDoc(candidateRef)

    if (!snapshot.exists()) {
      return null
    }

    const rawData: CandidatoRawDocument = {
      id: snapshot.id,
      ...(snapshot.data() as Omit<CandidatoRawDocument, 'id'>),
    }

    try {
      return candidateAdapter.fromDB(rawData)
    }
    catch (error) {
      console.error(`Candidato com ID ${id} possui dados inválidos ou incompletos:`, error)
      return null
    }
  }

  async findBatchById(ids: string[]): Promise<Candidato[]> {
    if (ids.length === 0) return []

    // Limite de 30 IDs por consulta 'in' do Firestore
    const CHUNK_SIZE = 30
    const chunks: string[][] = []

    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      chunks.push(ids.slice(i, i + CHUNK_SIZE))
    }

    const promises = chunks.map(async (chunk) => {
      const candidatesQuery = query(
        collection(firestore, CANDIDATES_COLLECTION),
        where(documentId(), 'in', chunk),
      )
      const snapshot = await getDocs(candidatesQuery)
      return this.mapSnapshotToCandidates(snapshot)
    })

    const results = await Promise.all(promises)
    return results.flat()
  }

  async deactivate(id: string): Promise<void> {
    const candidateRef = doc(firestore, CANDIDATES_COLLECTION, id)

    try {
      await updateDoc(candidateRef, {
        isActive: false,
      })
    }
    catch (error) {
      console.error(`Erro ao desativar o candidato com ID ${id}:`, error)
      throw new Error(`Não foi possível desativar o candidato ${id}.`)
    }
  }

  async create(domain: Candidato): Promise<void> {
    const dbData = candidateAdapter.toDB(domain)

    // Verificar Idade
    if (!this.isValidaDoB(dbData.dataNascimento)) {
      return
    }

    // Criar data
    const data = omitId<CandidatoDocument>(dbData)

    try {
      await addDoc(collection(firestore, CANDIDATES_COLLECTION), data)
    }
    catch (error) {
      console.error('Erro ao criar candidato:', error)
      throw new Error('Não foi possível salvar o novo candidato.')
    }
  }

  async saveBatch(domain: Candidato[]): Promise<Candidato[]> {
    const batch = writeBatch(firestore)
    const collectionRef = collection(firestore, CANDIDATES_COLLECTION)

    // Lista para guardar os candidatos formatados com seus IDs reais do Firestore
    const candidatosComId: Candidato[] = []

    domain.forEach((candidato) => {
      const dbData = candidateAdapter.toDB(candidato)

      // Verificar Idade
      if (!this.isValidaDoB(dbData.dataNascimento)) {
        return
      }

      const data = omitId<CandidatoDocument>(dbData)

      // Cria a referência gerando o ID único antecipadamente
      const candidateRef = doc(collectionRef)

      batch.set(candidateRef, data)

      // Adiciona o candidato com o ID real na lista de retorno
      candidatosComId.push({
        ...candidato,
        id: candidateRef.id,
      })
    })

    try {
      await batch.commit()
    }
    catch (error) {
      console.error('Erro ao executar criação em lote (batch) de candidatos:', error)
      throw new Error('Não foi possível concluir o cadastro em lote dos candidatos.')
    }

    return candidatosComId
  }

  async update(domain: Candidato): Promise<void> {
    const dbData = candidateAdapter.toDB(domain)

    // Verificar Idade
    if (!this.isValidaDoB(dbData.dataNascimento)) {
      return
    }

    const data = omitId<CandidatoDocument>(dbData)

    const candidateRef = doc(firestore, CANDIDATES_COLLECTION, domain.id)

    try {
      await updateDoc(candidateRef, data)
    }
    catch (error) {
      console.error(`Erro ao atualizar o candidato com ID ${domain.id}:`, error)
      throw new Error(`Não foi possível atualizar os dados do candidato ${domain.id}.`)
    }
  }
}

export const firebaseCandidate = new FirebaseCandidatesRepository()
