import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore'

import { Election, ElectionStatus } from './Election'

import { firestore } from './firebase'
import { fromFirebase, toFirebase } from './FirebaseElectionAdapter'

// Types
export interface CreateElectionInput {
  title: string
  description?: string
  startsAt: Date
  endsAt: Date
  status?: ElectionStatus
}

export interface UpdateElectionInput {
  title?: string
  description?: string
  startsAt?: Date
  endsAt?: Date
  status?: ElectionStatus
}

// Constantes
const ELECTIONS_COLLECTION = 'elections'

// ==========================================
// Repository Implementation
// ==========================================

export class FirebaseElectionRepository {
  async findAll(): Promise<Election[]> {
    const electionsQuery = query(
      collection(firestore, ELECTIONS_COLLECTION),
      orderBy('starts_at', 'desc'),
    )

    const snapshot = await getDocs(electionsQuery)

    return snapshot.docs.map((document) =>
      fromFirebase(document.id, document.data()),
    )
  }

  async findById(id: string): Promise<Election | null> {
    const electionReference = doc(firestore, ELECTIONS_COLLECTION, id)
    const snapshot = await getDoc(electionReference)

    if (!snapshot.exists()) {
      return null
    }

    return fromFirebase(snapshot.id, snapshot.data())
  }

  async create(input: CreateElectionInput): Promise<Election> {
    const now = new Date()

    const electionToCreate: Election = {
      id: '',
      title: input.title,
      description: input.description ?? '',
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: input.status ?? 'draft',
      createdAt: now,
      updatedAt: now,
    }

    const firebaseData = toFirebase(electionToCreate)

    const documentReference = await addDoc(
      collection(firestore, ELECTIONS_COLLECTION),
      firebaseData as DocumentData, // <-- 2. Cast here for addDoc
    )

    const createdElection = await this.findById(documentReference.id)

    if (!createdElection) {
      throw new Error(
        `Election "${documentReference.id}" was created but could not be read.`,
      )
    }

    return createdElection
  }

  async update(id: string, input: UpdateElectionInput): Promise<Election> {
    const currentElection = await this.findById(id)

    if (!currentElection) {
      throw new Error(`Election "${id}" was not found.`)
    }

    const updatedElection: Election = {
      id,
      title: input.title ?? currentElection.title,
      description: input.description ?? currentElection.description,
      startsAt: input.startsAt ?? currentElection.startsAt,
      endsAt: input.endsAt ?? currentElection.endsAt,
      status: input.status ?? currentElection.status,
      createdAt: currentElection.createdAt,
      updatedAt: new Date(),
    }

    const firebaseData = toFirebase(updatedElection)

    await updateDoc(
      doc(firestore, ELECTIONS_COLLECTION, id), 
      firebaseData as DocumentData,
    )

    return updatedElection
  }
}