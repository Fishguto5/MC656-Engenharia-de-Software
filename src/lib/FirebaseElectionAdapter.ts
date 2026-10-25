import { DocumentData, Timestamp } from 'firebase/firestore'
import { ElectionStatus, Election } from './Election'
import { FirebaseElectionData, FirebaseElectionDocument } from './FirebaseElectionData'

// Help Functions
function requireNonEmptyString(value: unknown, fieldName: string, id: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`[Election:${id}] Invalid or missing required field '${fieldName}'.`)
  }
  return value.trim()
}

function optionalString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function requireDate(
  value: Timestamp | Date | string | number | null | undefined,
  fieldName: string,
  id: string,
): Date {
  if (value instanceof Timestamp) {
    return value.toDate()
  }
  if (value instanceof Date) {
    return value
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return date
    }
  }
  throw new Error(`[Election:${id}] Invalid or missing date field '${fieldName}'.`)
}

function parseStatus(value: unknown, id: string): ElectionStatus {
  const validStatuses: ElectionStatus[] = [
    'draft',
    'scheduled',
    'open',
    'closed',
    'cancelled',
  ]

  if (typeof value === 'string' && validStatuses.includes(value as ElectionStatus)) {
    return value as ElectionStatus
  }

  throw new Error(`[Election:${id}] Invalid status value '${String(value)}'.`)
}

function validateDateOrder(startsAt: Date, endsAt: Date, id: string): void {
  if (startsAt.getTime() >= endsAt.getTime()) {
    throw new Error(`[Election:${id}] 'startsAt' must be strictly before 'endsAt'.`)
  }
}

// Main Function

export function fromFirebase(
  id: string,
  rawData: FirebaseElectionData | DocumentData,
): Election {
  const data = rawData as FirebaseElectionData

  const startsAt = requireDate(data.starts_at, 'starts_at', id)
  const endsAt = requireDate(data.ends_at, 'ends_at', id)

  validateDateOrder(startsAt, endsAt, id)

  return {
    id,
    title: requireNonEmptyString(data.title, 'title', id),
    description: optionalString(data.description),
    startsAt,
    endsAt,
    status: parseStatus(data.status, id),
    createdAt: requireDate(data.created_at, 'created_at', id),
    updatedAt: requireDate(data.updated_at ?? data.created_at, 'updated_at', id),
  }
}

export function toFirebase(election: Election): FirebaseElectionDocument {
  return {
    title: election.title,
    description: election.description,
    starts_at: Timestamp.fromDate(election.startsAt),
    ends_at: Timestamp.fromDate(election.endsAt),
    status: election.status,
    created_at: Timestamp.fromDate(election.createdAt),
    updated_at: Timestamp.fromDate(election.updatedAt),
  }
}
