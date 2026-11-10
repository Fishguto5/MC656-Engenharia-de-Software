import { VotosCandidato } from '@/interfaces/eleicaoInterfaces'
import { firestore } from '../firebase'
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore'
import { votesCandidateAdapter } from '../adapter/firebaseVotesCandidateAdapter'
import { CANDIDATES_ELECTION_SUBSOLLECTION } from '../constants/election'
import { firebaseCandidate } from './firebaseCandidatesRepository'

export class FirebaseVotesCandidateRepository {
  /**
   * Busca todos os candidatos/votos de uma eleição específica na subcoleção
   * e os enriquece com os dados cadastrais da coleção global de candidatos.
   */
  async findByElectionId(eleicaoId: string, collectionName: string): Promise<VotosCandidato[]> {
    const subColRef = collection(firestore, collectionName, eleicaoId, CANDIDATES_ELECTION_SUBSOLLECTION)
    const snapshot = await getDocs(subColRef)

    if (snapshot.empty) {
      return []
    }

    // Extrai os dados específicos de votação da subcoleção
    const votosDocs = snapshot.docs.map((docSnap) => {
      const data = docSnap.data()
      return {
        candidatoId: data.candidatoId || docSnap.id,
        votos: data.votos ?? 0,
        numero: data.numero ?? 0,
      }
    })

    // Coleta todos os IDs para buscar em lote na coleção global
    const candidatoIds = votosDocs.map(v => v.candidatoId)
    const candidatosBase = await firebaseCandidate.findBatchById(candidatoIds)
    const candidatosMap = new Map(candidatosBase.map(c => [c.id, c]))

    // Combina os dados de voto com os dados cadastrais do candidato
    const resultado: VotosCandidato[] = []

    for (const votoDoc of votosDocs) {
      const candidatoBase = candidatosMap.get(votoDoc.candidatoId)
      if (candidatoBase) {
        resultado.push({
          ...candidatoBase,
          votos: votoDoc.votos,
          numero: votoDoc.numero,
        })
      }
    }

    return resultado
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
