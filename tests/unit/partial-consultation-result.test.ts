import { describe, expect, it } from 'vitest'
import { parsePartialConsultationResult } from '@/lib/partialConsultationResult'

const now = new Date('2026-11-22T12:00:00.000Z')
const consultation = {
  type: 'public-consultation',
  title: 'Consulta sobre transporte',
  local: 'SP',
  status: 'open',
  startsAt: '2026-11-21T12:00:00.000Z',
  endsAt: '2026-11-23T12:00:00.000Z',
  partialResultsAllowed: true,
  sim: 4,
  nao: 2,
}

describe('divulgação parcial de consultas públicas', () => {
  it('exibe apenas contadores agregados quando autorizada e aberta', () => {
    expect(parsePartialConsultationResult(consultation, now)).toEqual({
      title: consultation.title, local: 'SP', sim: 4, nao: 2,
    })
  })

  it('oculta contagens quando não há autorização ou a votação não está aberta', () => {
    expect(parsePartialConsultationResult({ ...consultation, partialResultsAllowed: false }, now)).toBeNull()
    expect(parsePartialConsultationResult({ ...consultation, partialResultsAllowed: undefined }, now)).toBeNull()
    expect(parsePartialConsultationResult({ ...consultation, type: 'president' }, now)).toBeNull()
    expect(parsePartialConsultationResult({ ...consultation, status: 'cancelled' }, now)).toBeNull()
    expect(parsePartialConsultationResult(consultation, new Date('2026-11-24T12:00:00.000Z'))).toBeNull()
  })

  it('não divulga contadores inválidos', () => {
    expect(parsePartialConsultationResult({ ...consultation, sim: -1 }, now)).toBeNull()
    expect(parsePartialConsultationResult({ ...consultation, nao: 1.5 }, now)).toBeNull()
  })
})
