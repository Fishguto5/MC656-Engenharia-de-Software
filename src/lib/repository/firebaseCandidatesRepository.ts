import { Candidato } from '@/interfaces/eleicaoInterfaces'
import { QuerySnapshot, query, collection, orderBy, getDocs, where, doc, updateDoc, getDoc, addDoc, QueryDocumentSnapshot, DocumentData } from '@firebase/firestore'
import { candidateAdapter, CandidatoRawDocument } from '../adapter/firebaseCandidateAdapter'
import { firestore } from '../firebase'

const CANDIDATES_COLLECTION = 'candidatos'

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
        return [] // Ignora o registro inválido
      }
    })
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
      console.error(`Candidato com ID ${id} possui dados inválidos:`, error)
      return null
    }
  }

  async deactivate(id: string): Promise<void> {
    const candidateRef = doc(firestore, CANDIDATES_COLLECTION, id)

    await updateDoc(candidateRef, {
      isActive: false,
    })
  }

  async create(domain: Candidato): Promise<void> {
    const dbData = candidateAdapter.toDB(domain)
    const data = {
      nome: dbData.nome,
      partido: dbData.partido,
      dataNascimento: dbData.dataNascimento,
      federacao: dbData.federacao,
      isActive: dbData.isActive,
    }

    await addDoc(collection(firestore, CANDIDATES_COLLECTION), data)
  }

  async update(domain: Candidato): Promise<void> {
    const data = candidateAdapter.toDB(domain)
    const candidateRef = doc(firestore, CANDIDATES_COLLECTION, domain.id)

    await updateDoc(candidateRef, data)
  }
}

export const firebaseCandidateRepository = new FirebaseCandidatesRepository()
