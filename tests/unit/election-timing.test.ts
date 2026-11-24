import { describe, expect, it } from 'vitest'
import { canPublishResults, getElectionPhase, isVotingOpen } from '@/lib/election-timing'

const start = new Date('2026-11-21T10:00:00Z')
const end = new Date('2026-11-21T12:00:00Z')

describe('horário da votação', () => {
  it('mantém agendada antes do início e aberta durante o período', () => {
    expect(getElectionPhase('scheduled', start, end, new Date('2026-11-21T09:59:59Z'))).toBe('scheduled')
    expect(isVotingOpen('scheduled', start, end, start)).toBe(true)
  })

  it('encerra exatamente no horário final mesmo com status salvo como aberto', () => {
    expect(getElectionPhase('open', start, end, end)).toBe('closed')
    expect(isVotingOpen('open', start, end, end)).toBe(false)
    expect(canPublishResults('open', start, end, end)).toBe(true)
  })

  it('não permite divulgar antes do horário final mesmo se o status estiver fechado', () => {
    const beforeEnd = new Date('2026-11-21T11:00:00Z')
    expect(isVotingOpen('closed', start, end, beforeEnd)).toBe(false)
    expect(canPublishResults('closed', start, end, beforeEnd)).toBe(false)
  })

  it('não abre rascunhos nem eleições canceladas', () => {
    const now = new Date('2026-11-21T11:00:00Z')
    expect(isVotingOpen('draft', start, end, now)).toBe(false)
    expect(isVotingOpen('cancelled', start, end, now)).toBe(false)
  })
})
