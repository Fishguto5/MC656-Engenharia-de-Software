import 'server-only'

import { getAdminFirestore } from './firebase-admin'

export type AdminRegistrationResult = 'created' | 'promoted' | 'already-admin'

export async function registerAdmin(cpf: string): Promise<AdminRegistrationResult> {
  const db = getAdminFirestore()
  const reference = db.collection('users').doc(cpf)

  return db.runTransaction(async (transaction) => {
    const current = await transaction.get(reference)
    if (current.exists && current.data()?.isAdmin === true) return 'already-admin'

    transaction.set(reference, { isAdmin: true }, { merge: true })
    return current.exists ? 'promoted' : 'created'
  })
}
