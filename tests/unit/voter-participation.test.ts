import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/firebase', () => ({ firestore: {} }))
vi.mock('firebase/firestore', () => ({ doc: vi.fn((...parts: string[]) => parts.slice(1).join('/')) }))

import { parseVoter, participationRef } from '@/lib/voterParticipation'

describe('identificador de participação', () => {
  it('valida CPF e UF antes de consultar o registro', () => {
    expect(parseVoter({ cpf: '529.982.247-25', uf: 'SP' })).toEqual({ cpf: '52998224725', uf: 'SP' })
    expect(parseVoter({ cpf: '11111111111', uf: 'SP' })).toBeNull()
    expect(parseVoter({ cpf: '52998224725', uf: 'XX' })).toBeNull()
  })

  it('não usa CPF em claro no identificador', () => {
    process.env.VOTER_PARTICIPATION_SECRET = 'test-secret-with-at-least-thirty-two-characters'
    const reference = participationRef('eleicao-1', '52998224725') as unknown as string
    expect(reference).toContain('eleicoes/eleicao-1/participacoes/')
    expect(reference).not.toContain('52998224725')
  })
})
