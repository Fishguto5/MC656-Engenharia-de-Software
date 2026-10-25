export type ElectionStatus =
  | 'draft'
  | 'scheduled'
  | 'open'
  | 'closed'
  | 'cancelled'

export interface Election {
  id: string
  title: string
  description: string
  startsAt: Date
  endsAt: Date
  status: ElectionStatus
  createdAt: Date
  updatedAt: Date
}