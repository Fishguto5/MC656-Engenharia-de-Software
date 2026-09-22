import { describe, expect, it } from 'vitest'
import { formatCpf } from '@/app/sign-up/page'

describe('formatCpf', () => {
  it('aplica a máscara ao CPF', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25')
  })

  it('remove caracteres não numéricos e limita a entrada a 11 dígitos', () => {
    expect(formatCpf('abc529.982.247-25999')).toBe('529.982.247-25')
  })

  it('mantém valores parciais corretamente formatados', () => {
    expect(formatCpf('529982')).toBe('529.982')
    expect(formatCpf('529982247')).toBe('529.982.247')
  })
})
