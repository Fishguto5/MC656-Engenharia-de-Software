static fromFirebase(
  id: string,
  rawData: FirebaseElectionData | DocumentData,
): Election {
  const data = rawData as FirebaseElectionData

  const election = {
    id,
    title: this.requireNonEmptyString(data.title, 'title', id),
    description: this.optionalString(data.description),
    startsAt: this.requireDate(data.starts_at, 'starts_at', id),
    endsAt: this.requireDate(data.ends_at, 'ends_at', id),
    status: this.parseStatus(data.status, id),
    createdAt: this.requireDate(
      data.created_at,
      'created_at',
      id,
    ),
    updatedAt: this.requireDate(
      data.updated_at ?? data.created_at,
      'updated_at',
      id,
    ),
  }

  this.validateDateOrder(
    election.startsAt,
    election.endsAt,
    election.id,
  )

  return election
}