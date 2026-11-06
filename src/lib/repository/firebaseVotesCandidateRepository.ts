import { VotosCandidato } from '@/interfaces/eleicaoInterfaces'
import { firestore } from '../firebase'
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore'
import { CANDIDATES_ELECTION_SUBSOLLECTION } from './firebaseElectionPresidentRepository'
import { votesCandidateAdapter } from '../adapter/firebaseVotesCandidateAdapter copy'

export class FirebaseVotesCandidateRepository {
  /**
   * Busca todos os candidatos/votos de uma eleição específica na subcoleção.
   */
  async findByElectionId(eleicaoId: string, collectionName: string): Promise<VotosCandidato[]> {
    const subColRef = collection(firestore, collectionName, eleicaoId, CANDIDATES_ELECTION_SUBSOLLECTION)
    const snapshot = await getDocs(subColRef)

    if (snapshot.empty) {
      return []
    }

    return snapshot.docs.map(docSnap => {
      const raw = {
        id: docSnap.id,
        ...docSnap.data(),
      }
      return votesCandidateAdapter.fromDB(raw as any)
    })
  }

  async saveBatch(eleicaoId: string, collectionName: string, candidatos: VotosCandidato[]): Promise<void> {
    const batch = writeBatch(firestore)

    for (const candidato of candidatos) {
      const dbData = votesCandidateAdapter.toDB(candidato, { eleicaoId })
      // O ID do documento na subcoleção pode ser o ID do próprio candidato
      const docRef = doc(firestore, collectionName, eleicaoId, CANDIDATES_ELECTION_SUBSOLLECTION, candidato.id)
      batch.set(docRef, dbData)
    }

    await batch.commit()
  }
}

export const firebaseVotesCandidate = new FirebaseVotesCandidateRepository()