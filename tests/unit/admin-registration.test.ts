import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { registerAdmin } from '@/lib/admin-registration'

vi.mock('server-only', () => ({}))
vi.mock('firebase-admin/app', () => ({
  getApps: vi.fn(() => [{}]),
  initializeApp: vi.fn(),
  applicationDefault: vi.fn(),
}))
vi.mock('firebase-admin/firestore', () => ({ getFirestore: vi.fn() }))

const cpf = '52998224725'
const reference = { id: cpf }
const set = vi.fn()
const get = vi.fn()
const transaction = { get, set }

beforeEach(() => {
  vi.clearAllMocks()
  const db = {
    collection: vi.fn(() => ({ doc: vi.fn(() => reference) })),
    runTransaction: vi.fn(async (callback: (value: typeof transaction) => Promise<string>) => callback(transaction)),
  }
  vi.mocked(getFirestore).mockReturnValue(db as never)
})

describe('cadastro de administradores no Firestore', () => {
  it('cria o documento com isAdmin true para um CPF novo', async () => {
    get.mockResolvedValue({ exists: false })

    expect(await registerAdmin(cpf)).toBe('created')
    expect(getApps).toHaveBeenCalled()
    expect(get).toHaveBeenCalledWith(reference)
    expect(set).toHaveBeenCalledWith(reference, { isAdmin: true }, { merge: true })
  })

  it('promove usuário existente sem apagar outros campos', async () => {
    get.mockResolvedValue({ exists: true, data: () => ({ isAdmin: false, nome: 'Maria' }) })

    expect(await registerAdmin(cpf)).toBe('promoted')
    expect(set).toHaveBeenCalledWith(reference, { isAdmin: true }, { merge: true })
  })

  it('não regrava um administrador já cadastrado', async () => {
    get.mockResolvedValue({ exists: true, data: () => ({ isAdmin: true }) })

    expect(await registerAdmin(cpf)).toBe('already-admin')
    expect(set).not.toHaveBeenCalled()
  })
})
