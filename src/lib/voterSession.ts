export interface VoterSession {
  cpf: string
  name: string
}

const STORAGE_KEY = 'voter:session'

export function saveVoterSession(voter: VoterSession): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(voter))
}

export function readVoterSession(): VoterSession | null {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as unknown
    if (!stored || typeof stored !== 'object' || !('cpf' in stored) || !('name' in stored)) return null
    if (typeof stored.cpf !== 'string' || !/^\d{11}$/.test(stored.cpf)) return null
    if (typeof stored.name !== 'string' || !stored.name.trim()) return null
    return { cpf: stored.cpf, name: stored.name }
  }
  catch {
    return null
  }
}
