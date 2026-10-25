import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Esse teste tem como objetivo ver se o Firebase foi inicializado como esperado
// Puxa as variáveis de ambiente, que devem estar dentro de um arquivo .env de cada máquina
// Importa o objeto do firebase.ts

const initializeAppMock = vi.fn(() => ({ name: 'test-app' }))
const getAppsMock = vi.fn(() => [])
const getAppMock = vi.fn(() => ({ name: 'test-app' }))
const getAnalyticsMock = vi.fn(() => ({ name: 'test-analytics' }))

vi.mock('firebase/app', () => ({
  initializeApp: initializeAppMock,
  getApps: getAppsMock,
  getApp: getAppMock,
}))

vi.mock('firebase/analytics', () => ({
  getAnalytics: getAnalyticsMock,
}))

describe('configuração do Firebase', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'api-key'
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'example.firebaseapp.com'
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'example-project'
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'example.firebasestorage.app'
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 'sender-id'
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'app-id'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('inicializa o Firebase com as variáveis públicas configuradas', async () => {
    await import('@/lib/firebase')

    expect(initializeAppMock).toHaveBeenCalledWith({
      apiKey: 'api-key',
      authDomain: 'example.firebaseapp.com',
      projectId: 'example-project',
      storageBucket: 'example.firebasestorage.app',
      messagingSenderId: 'sender-id',
      appId: 'app-id',
    })
    expect(getAnalyticsMock).toHaveBeenCalledWith({ name: 'test-app' })
  })
})