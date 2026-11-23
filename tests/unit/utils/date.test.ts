import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import { isValidTimeFrame } from '@/lib/utils/date'

describe('isValidTimeFrame', () => {
  it('retorna true quando start é anterior a end (classe válida: start < end)', () => {
    const start = Timestamp.fromDate(new Date(2026, 9, 4, 10, 0, 0))
    const end = Timestamp.fromDate(new Date(2026, 9, 5, 10, 0, 0))

    expect(isValidTimeFrame(start, end)).toBe(true)
  })

  it('retorna false quando início e término têm o mesmo horário', () => {
    const start = Timestamp.fromDate(new Date(2026, 9, 4, 0, 0, 0, 0))
    const end = Timestamp.fromDate(new Date(2026, 9, 4, 0, 0, 0, 0))

    expect(isValidTimeFrame(start, end)).toBe(false)
  })

  it('permite início e término no mesmo dia com horário posterior', () => {
    const start = Timestamp.fromDate(new Date(2026, 9, 4, 10, 0))
    const end = Timestamp.fromDate(new Date(2026, 9, 4, 12, 0))

    expect(isValidTimeFrame(start, end)).toBe(true)
  })

  it('retorna false no limite após a meia-noite do dia seguinte', () => {
    const start = Timestamp.fromDate(new Date(2026, 9, 4, 0, 0, 0, 0))
    const end = Timestamp.fromDate(new Date(2026, 9, 3, 0, 0, 0, 0))

    expect(isValidTimeFrame(start, end)).toBe(false)
  })
})
