// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, cleanup } from '@testing-library/react'

const { replace, registerVote, checkParticipation, election } = vi.hoisted(() => ({
  replace: vi.fn(),
  registerVote: vi.fn(),
  checkParticipation: vi.fn(),
  election: {
    id: 'eleicao-1', type: 'public-consultation', title: 'Consulta', local: 'Brasil',
    status: 'open', startsAt: new Date('2020-01-01'), endsAt: new Date('2999-01-01'),
  },
}))

vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'eleicao-1' }), useRouter: () => ({ replace }) }))
vi.mock('@/lib/voterSession', () => ({ readVoterSession: () => ({ cpf: '52998224725', name: 'Eleitor', uf: 'SP' }) }))
vi.mock('@/lib/repository/firebaseElectionFacade', () => ({ firebaseElection: {
  getType: async () => 'public-consultation', findById: async () => election, registerVote,
} }))
vi.mock('@/lib/checkVoterParticipation', () => ({ checkVoterParticipation: checkParticipation }))
vi.mock('@/components/VotarForm/ConsultaPublicaVotar', () => ({
  ConsultaPublicaVotarForm: ({ onSubmit }: { onSubmit: (vote: unknown) => void }) => (
    <button onClick={() => onSubmit({ type: 'public-consultation', proposalApproved: true })}>Confirmar voto</button>
  ),
}))
vi.mock('@/components/VotarForm/DeputadoVotar', () => ({ DeputadoVotarForm: () => null }))
vi.mock('@/components/VotarForm/PresidenteVotar', () => ({ PresidenteVotarForm: () => null }))

import VotacaoPage from '@/app/(user)/votar/[id]/page'

beforeEach(() => {
  vi.clearAllMocks()
  checkParticipation.mockResolvedValue(false)
  registerVote.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('tela de votação', () => {
  it('bloqueia o formulário quando o CPF já participou', async () => {
    checkParticipation.mockResolvedValue(true)
    render(<VotacaoPage />)
    expect(await screen.findByText(/Você já participou desta votação/)).toBeTruthy()
    expect(screen.queryByText('Confirmar voto')).toBeNull()
  })

  it('exibe a conclusão após confirmação e volta à listagem em cinco segundos', async () => {
    render(<VotacaoPage />)
    const button = await screen.findByText('Confirmar voto')
    vi.useFakeTimers()
    await act(async () => {
      fireEvent.click(button)
    })
    expect(screen.getByRole('heading', { name: 'Voto computado' })).toBeTruthy()
    expect(registerVote).toHaveBeenCalledOnce()
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(replace).toHaveBeenCalledWith('/eleicoes')
  })
})
