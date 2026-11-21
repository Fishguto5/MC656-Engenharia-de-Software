import type { UF } from '@/lib/constants/election'
import { isUf } from '@/lib/electionEligibility'

export interface VoterSession {
  cpf: string
  name: string
  uf: UF
}

const STORAGE_KEY = 'voter:session'

export function saveVoterSession(voter: VoterSession): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(voter))
}

export function readVoterSession(): VoterSession | null {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as unknown
    if (!stored || typeof stored !== 'object' || !('cpf' in stored) || !('name' in stored) || !('uf' in stored)) return null
    if (typeof stored.cpf !== 'string' || !/^\d{11}$/.test(stored.cpf)) return null
    if (typeof stored.name !== 'string' || !stored.name.trim()) return null
    if (!isUf(stored.uf)) return null
    return { cpf: stored.cpf, name: stored.name, uf: stored.uf }
  }
  catch {
    return null
  }
}
