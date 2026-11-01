import { Candidato } from '@/interfaces/eleicaoInterfaces'
import { QuerySnapshot, query, collection, orderBy, getDocs, where, doc, updateDoc, getDoc, addDoc, QueryDocumentSnapshot, DocumentData, writeBatch, Timestamp } from 'firebase/firestore'
import { candidateAdapter, CandidatoRawDocument } from '../adapter/firebaseCandidateAdapter'
import { firestore } from '../firebase'

export const CANDIDATES_COLLECTION = 'candidatos'

/* Idade mínima para Deputado = 21 anos
 * Idade mínima para Presidente = 35 anos
 * A lógica de eleição verifica a idade para presidente
*/
export const MINIMUM_AGE = 21
export const getMaxDate = () => {
  const date = new Date()
  date.setFullYear(date.getFullYear() - MINIMUM_AGE)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
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
    // Remove horas/minutos para comparar apenas o dia
    const dateDoB = DoB.toDate()
    const dateCandidate = new Date(dateDoB.getFullYear(), dateDoB.getMonth(), dateDoB.getDate())
    const maxDate = new Date(`${getMaxDate()}T00:00:00`)

    return dateCandidate <= maxDate
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
    const data = {
      nome: dbData.nome,
      partido: dbData.partido,
      dataNascimento: dbData.dataNascimento,
      federacao: dbData.federacao,
      isActive: dbData.isActive,
    }

    try {
      await addDoc(collection(firestore, CANDIDATES_COLLECTION), data)
    }
    catch (error) {
      console.error('Erro ao criar candidato:', error)
      throw new Error('Não foi possível salvar o novo candidato.')
    }
  }

  async createBatch(domain: Candidato[]): Promise<Candidato[]> {
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

      const data = {
        nome: dbData.nome,
        partido: dbData.partido,
        dataNascimento: dbData.dataNascimento,
        federacao: dbData.federacao ?? null,
        isActive: dbData.isActive,
      }

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

    const data = {
      nome: dbData.nome,
      partido: dbData.partido,
      federacao: dbData.federacao ?? null,
      dataNascimento: dbData.dataNascimento,
      isActive: dbData.isActive,
    }

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

export const firebaseCandidateRepository = new FirebaseCandidatesRepository()
