import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { doc, getDoc } from 'firebase/firestore'
import { FirestoreAuthFacade } from '@/lib/auth'

// O Firebase é totalmente simulado: nenhum teste faz rede.
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ __db: true })),
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  getDoc: vi.fn(),
}))

const STORAGE_KEY = 'auth:user'
const config = { projectId: 'test' }

/** Simula o retorno de getDoc: `data` indefinido significa documento inexistente. */
function snapshot(id: string, data?: Record<string, unknown>) {
  return {
    id,
    exists: () => data !== undefined,
    data: () => data,
  }
}

function createStorage() {
  const items = new Map<string, string>()
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  }
}

let storage: ReturnType<typeof createStorage>

beforeEach(() => {
  vi.clearAllMocks()
  storage = createStorage()
  vi.stubGlobal('localStorage', storage)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('signIn', () => {
  it('normaliza um CPF formatado antes de consultar o Firestore', async () => {
    vi.mocked(getDoc).mockResolvedValue(snapshot('12345678909', { isAdmin: false }) as never)

    await new FirestoreAuthFacade(config).signIn('123.456.789-09')

    expect(doc).toHaveBeenCalledWith(expect.anything(), 'users', '12345678909')
  })

  it('retorna isAdmin true quando o documento tem isAdmin true', async () => {
    vi.mocked(getDoc).mockResolvedValue(snapshot('12345678909', { isAdmin: true }) as never)

    const user = await new FirestoreAuthFacade(config).signIn('12345678909')

    expect(user).toEqual({ cpf: '12345678909', isAdmin: true })
  })

  it('trata isAdmin ausente como false', async () => {
    vi.mocked(getDoc).mockResolvedValue(snapshot('12345678909', {}) as never)

    const user = await new FirestoreAuthFacade(config).signIn('12345678909')

    expect(user.isAdmin).toBe(false)
  })

  it('só aceita o booleano true como admin (string "true" não vale)', async () => {
    vi.mocked(getDoc).mockResolvedValue(snapshot('12345678909', { isAdmin: 'true' }) as never)

    const user = await new FirestoreAuthFacade(config).signIn('12345678909')

    expect(user.isAdmin).toBe(false)
  })

  it('atualiza currentUser e persiste a sessão no localStorage', async () => {
    vi.mocked(getDoc).mockResolvedValue(snapshot('12345678909', { isAdmin: true }) as never)
    const auth = new FirestoreAuthFacade(config)

    await auth.signIn('12345678909')

    expect(auth.currentUser()).toEqual({ cpf: '12345678909', isAdmin: true })
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual({ cpf: '12345678909', isAdmin: true })
  })

  it('rejeita CPF com quantidade de dígitos inválida sem consultar o Firestore', async () => {
    const auth = new FirestoreAuthFacade(config)

    await expect(auth.signIn('123')).rejects.toThrow('CPF inválido.')
    await expect(auth.signIn('')).rejects.toThrow('CPF inválido.')
    expect(getDoc).not.toHaveBeenCalled()
  })

  it('rejeita CPF inexistente e não persiste nada', async () => {
    vi.mocked(getDoc).mockResolvedValue(snapshot('12345678909') as never)
    const auth = new FirestoreAuthFacade(config)

    await expect(auth.signIn('12345678909')).rejects.toThrow('CPF não encontrado.')

    expect(auth.currentUser()).toBeNull()
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('propaga erros do Firestore sem alterar a sessão', async () => {
    vi.mocked(getDoc).mockRejectedValue(new Error('unavailable'))
    const auth = new FirestoreAuthFacade(config)

    await expect(auth.signIn('12345678909')).rejects.toThrow('unavailable')

    expect(auth.currentUser()).toBeNull()
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })
})

describe('sessão', () => {
  it('começa sem usuário quando não há nada salvo', () => {
    expect(new FirestoreAuthFacade(config).currentUser()).toBeNull()
  })

  it('restaura a sessão salva ao construir', () => {
    storage.setItem(STORAGE_KEY, JSON.stringify({ cpf: '12345678909', isAdmin: true }))

    const auth = new FirestoreAuthFacade(config)

    expect(auth.currentUser()).toEqual({ cpf: '12345678909', isAdmin: true })
  })

  it('ignora JSON corrompido no localStorage', () => {
    storage.setItem(STORAGE_KEY, '{não é json')

    expect(new FirestoreAuthFacade(config).currentUser()).toBeNull()
  })

  it('mantém a sessão entre instâncias (simula um refresh da página)', async () => {
    vi.mocked(getDoc).mockResolvedValue(snapshot('12345678909', { isAdmin: false }) as never)
    await new FirestoreAuthFacade(config).signIn('12345678909')

    const reloaded = new FirestoreAuthFacade(config)

    expect(reloaded.currentUser()).toEqual({ cpf: '12345678909', isAdmin: false })
  })

  it('signOut limpa o usuário e o localStorage', async () => {
    vi.mocked(getDoc).mockResolvedValue(snapshot('12345678909', { isAdmin: false }) as never)
    const auth = new FirestoreAuthFacade(config)
    await auth.signIn('12345678909')

    await auth.signOut()

    expect(auth.currentUser()).toBeNull()
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })
})
