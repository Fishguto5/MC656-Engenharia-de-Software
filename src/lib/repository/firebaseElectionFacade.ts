import { ElectionStatus } from '@/interfaces/firebaseInterfaces'
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '../firebase'
import { FirebaseDeputyRepository } from './firebaseElectionDeputyRepository'
import { FirebasePresidentRepository } from './firebaseElectionPresidentRepository'
import { FirebasePublicConsultationRepository } from './firebasePublicConsultationRepository'
import { EleicaoPresidente, EleicaoDeputado, ConsultaPublica } from '@/interfaces/eleicaoInterfaces'
import { ElectionType, VALID_ELECTION_TYPE } from '../constants/election'
import { ELECTION_COLLECTION } from '../constants/firebase'

// União de todos os domínios aceitos
export type EleicaoDomain = EleicaoPresidente | EleicaoDeputado | ConsultaPublica
export type VotePayload
  = | { type: 'president' | 'deputy', candidateNumber: number }
    | { type: 'public-consultation', proposalApproved: boolean }

class FirebaseElectionFacade {
  private async recordAction(id: string, action: 'created' | 'edited'): Promise<void> {
    const response = await fetch(`/api/admin/elections/${encodeURIComponent(id)}/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (!response.ok) throw new Error('A eleição foi salva, mas não foi possível registrar a ação no histórico. Verifique o relatório antes de tentar novamente.')
  }

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

  async getType(id: string): Promise<ElectionType | null> {
    const electionRef = doc(firestore, ELECTION_COLLECTION, id)
    const snapshot = await getDoc(electionRef)

    // Verificar se o doc existe
    if (!snapshot.exists()) return null

    // Retorna o tipo da eleição
    const electionData = snapshot.data()
    if (!electionData?.type || !VALID_ELECTION_TYPE.has(electionData.type)) {
      return null
    }

    return electionData.type as ElectionType
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
    if (!electionData?.type || !VALID_ELECTION_TYPE.has(electionData.type)) {
      return null
    }

    return electionData.type as ElectionType
  }

  async saveDraft(type: ElectionType, draftId: string | null, domain: Partial<EleicaoDomain>): Promise<string> {
    const repo = this.repositories[type]
    if (!repo) throw new Error(`Repositório não encontrado para o tipo: ${type}`)
    const id = await repo.saveDraft(draftId, domain as never)
    await this.recordAction(id, draftId ? 'edited' : 'created')
    return id
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
    const id = await repo.create(domain as never)
    await this.recordAction(id, 'created')
  }

  async update(type: ElectionType, domain: EleicaoDomain): Promise<void> {
    const repo = this.repositories[type]
    if (!repo) throw new Error(`Repositório não encontrado para o tipo: ${type}`)
    await repo.update(domain as never)
    await this.recordAction(domain.id, 'edited')
  }

  async registerVote(id: string, domain: VotePayload, voter: { cpf: string, uf: string }): Promise<void> {
    const response = await fetch(`/api/elections/${encodeURIComponent(id)}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...domain, cpf: voter.cpf, uf: voter.uf }),
    })
    if (!response.ok) {
      const result = await response.json() as { error?: string }
      throw new Error(result.error ?? 'Não foi possível registrar o voto.')
    }
  }
}

export const firebaseElection = new FirebaseElectionFacade()
