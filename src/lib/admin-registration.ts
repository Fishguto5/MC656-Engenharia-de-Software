import 'server-only'

import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export type AdminRegistrationResult = 'created' | 'promoted' | 'already-admin'

export async function registerAdmin(cpf: string): Promise<AdminRegistrationResult> {
  const app = getApps()[0] ?? initializeApp({
    credential: applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  })
  const db = getFirestore(app)
  const reference = db.collection('users').doc(cpf)

  return db.runTransaction(async (transaction) => {
    const current = await transaction.get(reference)
    if (current.exists && current.data()?.isAdmin === true) return 'already-admin'

    transaction.set(reference, { isAdmin: true }, { merge: true })
    return current.exists ? 'promoted' : 'created'
  })
}
