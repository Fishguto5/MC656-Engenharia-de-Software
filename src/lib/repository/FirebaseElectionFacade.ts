import { ElectionStatus, ElectionType, validElectionType } from '@/interfaces/firebaseInterfaces'
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '../firebase'
import { FirebaseDeputyRepository } from './firebaseElectionDeputyRepository'
import { FirebasePresidentRepository } from './firebaseElectionPresidentRepository'
import { FirebasePublicConsultationRepository } from './firebasePublicConsultationRepository'
import { ELECTION_COLLECTION } from '../constants/election'
import { EleicaoPresidente, EleicaoDeputado, ConsultaPublica } from '@/interfaces/eleicaoInterfaces'

// União de todos os domínios aceitos
export type EleicaoDomain = EleicaoPresidente | EleicaoDeputado | ConsultaPublica

class FirebaseElectionFacade {
  // Repositórios
  private firebaseDeputy = new FirebaseDeputyRepository()
  private firebasePresident = new FirebasePresidentRepository()
  private firebasePublicConsultation = new FirebasePublicConsultationRepository()

  // Retorna os repositórios apenas quando chamados, garantindo que tudo já foi inicializado
  private get repositories() {
    return {
      'president': this.firebasePresident,
      'deputy': this.firebaseDeputy,
      'public-consultation': this.firebasePublicConsultation,
    }
  }

  async getDraftType(id: string): Promise<ElectionType | null> {
    const electionRef = doc(firestore, ELECTION_COLLECTION, id)
    const snapshot = await getDoc(electionRef)

    // Verificar se o doc existe
    if (!snapshot.exists()) return null

    // Verificar se o status é draft
    const electionData = snapshot.data()
    if (!electionData?.status || electionData.status !== ('draft' as ElectionStatus)) {
      return null
    }

    // Retorna o tipo da eleição
    if (!electionData?.type || !validElectionType.has(electionData.type)) {
      return null
    }

    return electionData.type as ElectionType
  }

  async saveDraft(type: ElectionType, draftId: string | null, domain: Partial<EleicaoDomain>): Promise<string> {
    const repo = this.repositories[type]
    if (!repo) throw new Error(`Repositório não encontrado para o tipo: ${type}`)
    return repo.saveDraft(draftId, domain as never)
  }

  async findById(id: string, type: ElectionType): Promise<EleicaoDomain | null> {
    const repo = this.repositories[type]
    if (!repo) return null
    return repo.findById(id)
  }

  async findDraftById(id: string, type: ElectionType): Promise<Partial<EleicaoDomain> | null> {
    const repo = this.repositories[type]
    if (!repo) return null
    return repo.findDraftById(id)
  }

  async create(type: ElectionType, domain: EleicaoDomain): Promise<void> {
    const repo = this.repositories[type]
    if (!repo) throw new Error(`Repositório não encontrado para o tipo: ${type}`)
    return repo.create(domain as never)
  }

  async update(type: ElectionType, domain: EleicaoDomain): Promise<void> {
    const repo = this.repositories[type]
    if (!repo) throw new Error(`Repositório não encontrado para o tipo: ${type}`)
    return repo.update(domain as never)
  }
}

export const firebaseElection = new FirebaseElectionFacade()
