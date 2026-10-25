/** Interface comum para autenticação via Firebase
 *
 * Uma fachada (AuthFacade) com uma interface pequena e estável. O restante do app só conhece
 * `AuthFacade` e `User`, nunca o Firebase.
 *
 * Estrutura no Firestore (crie pelo console do Firebase):
 *   coleção "users", documento com ID = CPF do usuário (só dígitos), campo:
 *     isAdmin: boolean
 */

import { initializeApp, FirebaseOptions } from 'firebase/app'
import { Firestore, doc, getDoc, getFirestore } from 'firebase/firestore'

const STORAGE_KEY = 'auth:user'

export interface User {
  cpf: string
  isAdmin: boolean
}

export interface AuthFacade {
  signIn(cpf: string): Promise<User>
  signOut(): Promise<void>
  currentUser(): User | null
}

export class FirestoreAuthFacade implements AuthFacade {
  private readonly db: Firestore
  private user: User | null

  constructor(config: FirebaseOptions) {
    this.db = getFirestore(initializeApp(config))
    this.user = this.restore()
  }

  async signIn(cpf: string): Promise<User> {
    // Remove pontos e traços: o ID no Firestore é só dígitos
    const id = cpf.replace(/\D/g, '')
    if (id.length !== 11) throw new Error('CPF inválido.')

    const snap = await getDoc(doc(this.db, 'users', id))
    if (!snap.exists()) throw new Error('CPF não encontrado.')

    const user: User = {
      cpf: snap.id,
      isAdmin: snap.data().isAdmin === true,
    }

    this.setUser(user)
    return user
  }

  async signOut(): Promise<void> {
    this.setUser(null)
  }

  currentUser(): User | null {
    return this.user
  }

  private setUser(user: User | null): void {
    this.user = user
    if (user) globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else globalThis.localStorage.removeItem(STORAGE_KEY)
  }

  private restore(): User | null {
    try {
      const raw = globalThis.localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as User) : null
    }
    catch {
      return null
    }
  }
}
