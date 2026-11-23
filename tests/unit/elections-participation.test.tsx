// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const { checkParticipation } = vi.hoisted(() => ({ checkParticipation: vi.fn() }))

vi.mock('@/lib/firebase', () => ({ firestore: {} }))
vi.mock('@/lib/voterSession', () => ({ readVoterSession: () => ({ cpf: '52998224725', name: 'Eleitor', uf: 'SP' }) }))
vi.mock('@/lib/checkVoterParticipation', () => ({ checkVoterParticipation: checkParticipation }))
vi.mock('@/lib/publishedElectionResult', () => ({ loadPublishedElectionResult: vi.fn() }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(async () => ({
    docs: [{ id: 'consulta-1', data: () => ({
      title: 'Consulta pública', description: 'Tema', type: 'public-consultation', local: 'Brasil',
      status: 'open', startsAt: { toDate: () => new Date('2020-01-01') },
      endsAt: { toDate: () => new Date('2999-01-01') }, partialResultsAllowed: false,
    }) }],
  })),
}))

import ElectionsClientView from '@/app/(user)/eleicoes/ElectionsClientView'

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

describe('card de eleição após participação', () => {
  it('mostra voto computado e não oferece link para votar', async () => {
    checkParticipation.mockResolvedValue(true)
    render(<ElectionsClientView />)
    expect(await screen.findByText('Voto computado')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Votar em/ })).toBeNull()
  })

  it('não oferece link para votar quando a consulta falha', async () => {
    checkParticipation.mockRejectedValue(new Error('Indisponível'))
    render(<ElectionsClientView />)
    expect(await screen.findByText('Não foi possível verificar sua participação')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Votar em/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Tentar verificar participação novamente' })).toBeTruthy()
  })
})
