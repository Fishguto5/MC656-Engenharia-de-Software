import { getElectionPhase } from '@/lib/election-timing'

export type PartialConsultationResult = {
  title: string
  local: string
  sim: number
  nao: number
}

export function parsePartialConsultationResult(data: Record<string, unknown>, now = new Date()): PartialConsultationResult | null {
  if (data.type !== 'public-consultation'
    || data.partialResultsAllowed !== true
    || getElectionPhase(data.status, data.startsAt, data.endsAt, now) !== 'open'
    || typeof data.title !== 'string'
    || !data.title.trim()
    || typeof data.local !== 'string'
    || !Number.isSafeInteger(data.sim) || (data.sim as number) < 0
    || !Number.isSafeInteger(data.nao) || (data.nao as number) < 0) return null

  return { title: data.title, local: data.local, sim: data.sim as number, nao: data.nao as number }
}
