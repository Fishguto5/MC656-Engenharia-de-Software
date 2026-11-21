import type { ElectionStatus } from '@/interfaces/firebaseInterfaces'

export type ElectionPhase = ElectionStatus | 'unknown'

export function asElectionDate(value: unknown): Date | null {
  let date: Date | null = null
  if (value instanceof Date) date = value
  else if (typeof value === 'string') date = new Date(value)
  else if (value && typeof value === 'object') {
    if ('toDate' in value && typeof value.toDate === 'function') date = value.toDate() as Date
    else if ('seconds' in value && typeof value.seconds === 'number') date = new Date(value.seconds * 1000)
  }
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null
}

export function getElectionPhase(status: unknown, start: unknown, end: unknown, now = new Date()): ElectionPhase {
  if (status === 'draft' || status === 'cancelled') return status
  const startsAt = asElectionDate(start)
  const endsAt = asElectionDate(end)
  if (!startsAt || !endsAt || endsAt <= startsAt) return 'unknown'
  if (status === 'closed') return 'closed'
  if (now >= endsAt) return 'closed'
  if (now < startsAt) return 'scheduled'
  return 'open'
}

export function canPublishResults(status: unknown, start: unknown, end: unknown, now = new Date()): boolean {
  const startsAt = asElectionDate(start)
  const endsAt = asElectionDate(end)
  return status !== 'draft'
    && status !== 'cancelled'
    && startsAt !== null
    && endsAt !== null
    && endsAt > startsAt
    && now >= endsAt
}

export function isVotingOpen(status: unknown, start: unknown, end: unknown, now = new Date()): boolean {
  return getElectionPhase(status, start, end, now) === 'open'
}
