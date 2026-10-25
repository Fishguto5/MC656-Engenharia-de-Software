import type { Timestamp } from 'firebase/firestore'
import { ElectionStatus } from './Election'

export interface FirebaseElectionData {
  title?: unknown
  description?: unknown
  starts_at?: Timestamp | Date | string | number | null
  ends_at?: Timestamp | Date | string | number | null
  status?: unknown
  created_at?: Timestamp | Date | string | number | null
  updated_at?: Timestamp | Date | string | number | null
}

export interface FirebaseElectionDocument {
  title: string
  description: string
  starts_at: Timestamp
  ends_at: Timestamp
  status: ElectionStatus
  created_at: Timestamp
  updated_at: Timestamp
}
