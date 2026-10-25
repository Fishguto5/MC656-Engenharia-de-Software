import { Election } from '@/lib/Election'
import { fromFirebase, toFirebase } from '@/lib/FirebaseElectionAdapter'
import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

describe('FirebaseElectionAdapter', () => {
  it('converts Firebase data to an Election', () => {
    const startsAt = new Date('2026-11-10T12:00:00.000Z')
    const endsAt = new Date('2026-11-11T12:00:00.000Z')
    const createdAt = new Date('2026-10-25T12:00:00.000Z')
    const updatedAt = new Date('2026-10-26T12:00:00.000Z')

    const election = fromFirebase('election-1', {
      title: '  Eleição do Centro Acadêmico  ',
      description: '  Eleição para a nova gestão  ',
      starts_at: Timestamp.fromDate(startsAt),
      ends_at: Timestamp.fromDate(endsAt),
      status: 'scheduled',
      created_at: Timestamp.fromDate(createdAt),
      updated_at: Timestamp.fromDate(updatedAt),
    })

    expect(election).toEqual({
      id: 'election-1',
      title: 'Eleição do Centro Acadêmico',
      description: 'Eleição para a nova gestão',
      startsAt,
      endsAt,
      status: 'scheduled',
      createdAt,
      updatedAt,
    })
  })

  it('accepts ISO strings as dates', () => {
    const election = fromFirebase('election-2', {
      title: 'Eleição de teste',
      description: '',
      starts_at: '2026-11-10T12:00:00.000Z',
      ends_at: '2026-11-11T12:00:00.000Z',
      status: 'draft',
      created_at: '2026-10-25T12:00:00.000Z',
      updated_at: '2026-10-25T12:00:00.000Z',
    })

    expect(election.startsAt).toEqual(new Date('2026-11-10T12:00:00.000Z'))
    expect(election.endsAt).toEqual(new Date('2026-11-11T12:00:00.000Z'))
  })

  it('uses created_at when updated_at is absent', () => {
    const createdAt = new Date('2026-10-25T12:00:00.000Z')

    const election = fromFirebase('election-3', {
      title: 'Eleição de teste',
      description: '',
      starts_at: new Date('2026-11-10T12:00:00.000Z'),
      ends_at: new Date('2026-11-11T12:00:00.000Z'),
      status: 'draft',
      created_at: createdAt,
    })

    expect(election.updatedAt).toEqual(createdAt)
  })

  it('throws an error when title is empty', () => {
    expect(() =>
      fromFirebase('invalid-election', {
        title: ' ',
        starts_at: new Date('2026-11-10T12:00:00.000Z'),
        ends_at: new Date('2026-11-11T12:00:00.000Z'),
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date(),
      }),
    ).toThrow('[Election:invalid-election] Invalid or missing required field \'title\'.')
  })

  it('throws an error for an invalid status', () => {
    expect(() =>
      fromFirebase('invalid-election', {
        title: 'Eleição inválida',
        starts_at: new Date('2026-11-10T12:00:00.000Z'),
        ends_at: new Date('2026-11-11T12:00:00.000Z'),
        status: 'unknown-status',
        created_at: new Date(),
        updated_at: new Date(),
      }),
    ).toThrow('[Election:invalid-election] Invalid status value \'unknown-status\'.')
  })

  it('throws an error when election ends before it starts', () => {
    expect(() =>
      fromFirebase('invalid-election', {
        title: 'Eleição inválida',
        starts_at: new Date('2026-11-11T12:00:00.000Z'),
        ends_at: new Date('2026-11-10T12:00:00.000Z'),
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date(),
      }),
    ).toThrow('[Election:invalid-election] \'startsAt\' must be strictly before \'endsAt\'.')
  })

  it('converts an Election to Firebase format', () => {
    const startsAt = new Date('2026-11-10T12:00:00.000Z')
    const endsAt = new Date('2026-11-11T12:00:00.000Z')
    const createdAt = new Date('2026-10-25T12:00:00.000Z')
    const updatedAt = new Date('2026-10-26T12:00:00.000Z')

    const election: Election = {
      id: 'election-1',
      title: 'Eleição de teste',
      description: 'Descrição',
      startsAt,
      endsAt,
      status: 'scheduled',
      createdAt,
      updatedAt,
    }

    const firebaseData = toFirebase(election)

    expect(firebaseData.title).toBe('Eleição de teste')
    expect(firebaseData.description).toBe('Descrição')
    expect(firebaseData.status).toBe('scheduled')

    expect((firebaseData.starts_at as Timestamp).toDate()).toEqual(startsAt)
    expect((firebaseData.ends_at as Timestamp).toDate()).toEqual(endsAt)
    expect((firebaseData.created_at as Timestamp).toDate()).toEqual(createdAt)
    expect((firebaseData.updated_at as Timestamp).toDate()).toEqual(updatedAt)
  })
})
