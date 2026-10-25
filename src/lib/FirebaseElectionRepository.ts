import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'

import { firestore } from '@/config/firebase'
import type { Election } from '@/domain/election/Election'
import type {
  CreateElectionInput,
  ElectionRepository,
  UpdateElectionInput,
} from '@/repositories/ElectionRepository'

import { FirebaseElectionAdapter } from '../adapters/FirebaseElectionAdapter'

const ELECTIONS_COLLECTION = 'elections'

export class FirebaseElectionRepository
implements ElectionRepository {
  async findAll(): Promise<Election[]> {
    const electionsQuery = query(
      collection(firestore, ELECTIONS_COLLECTION),
      orderBy('starts_at', 'desc'),
    )

    const snapshot = await getDocs(electionsQuery)

    return snapshot.docs.map(document =>
      FirebaseElectionAdapter.fromSnapshot(document),
    )
  }

  async findById(id: string): Promise<Election | null> {
    const electionReference = doc(
      firestore,
      ELECTIONS_COLLECTION,
      id,
    )

    const snapshot = await getDoc(electionReference)

    if (!snapshot.exists()) {
      return null
    }

    return FirebaseElectionAdapter.fromSnapshot(snapshot)
  }

  async create(
    input: CreateElectionInput,
  ): Promise<Election> {
    const now = new Date()

    const electionToCreate: Omit<Election, 'id'> = {
      title: input.title,
      description: input.description,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: input.status ?? 'draft',
      createdAt: now,
      updatedAt: now,
    }

    const firebaseData =
      FirebaseElectionAdapter.toFirebase(electionToCreate)

    const documentReference = await addDoc(
      collection(firestore, ELECTIONS_COLLECTION),
      firebaseData,
    )

    const createdElection = await this.findById(
      documentReference.id,
    )

    if (!createdElection) {
      throw new Error(
        `Election "${documentReference.id}" was created but could not be read`,
      )
    }

    return createdElection
  }

  async update(
    id: string,
    input: UpdateElectionInput,
  ): Promise<Election> {
    const currentElection = await this.findById(id)

    if (!currentElection) {
      throw new Error(`Election "${id}" was not found`)
    }

    const updatedElection: Omit<Election, 'id'> = {
      title: input.title ?? currentElection.title,
      description:
        input.description ?? currentElection.description,
      startsAt: input.startsAt ?? currentElection.startsAt,
      endsAt: input.endsAt ?? currentElection.endsAt,
      status: input.status ?? currentElection.status,
      createdAt: currentElection.createdAt,
      updatedAt: new Date(),
    }

    const firebaseData =
      FirebaseElectionAdapter.toFirebase(updatedElection)

    await updateDoc(
      doc(firestore, ELECTIONS_COLLECTION, id),
      {
        ...firebaseData,
        updated_at: Timestamp.fromDate(
          updatedElection.updatedAt,
        ),
      },
    )

    return {
      id,
      ...updatedElection,
    }
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(
      doc(firestore, ELECTIONS_COLLECTION, id),
    )
  }
}