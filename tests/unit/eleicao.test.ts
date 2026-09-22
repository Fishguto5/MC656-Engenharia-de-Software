import {
  type Candidato,
  type VotacaoPresidente,
  type ConsultaPublica,
  precisaSegundoTurno,
  resultadoConsultaPublica,
  getCandidatosSegundoTurno,
  getResultadoPrimeiroTurno,
} from '@/lib/eleicao'
import { beforeEach, describe, expect, it } from 'vitest'

describe('precisaSegundoTurno', () => {
  let votacao: VotacaoPresidente

  beforeEach(() => {
    votacao = {
      id: '',
      data: new Date(),
      candidatos: [],
      votosBrancos: 0,
      votosNulos: 0,
    }
  })

  it('votacao vazia', () => {
    const res = precisaSegundoTurno(votacao)
    expect(res).toBe(false)
  })

  it('votacao com um candidato', () => {
    votacao.candidatos = [{
      id: '',
      nome: '',
      partido: '',
      votos: 30,
    }]

    const res = precisaSegundoTurno(votacao)
    expect(res).toBe(false)
  })

  it('votacao com tres candidatos sem segundo turno', () => {
    votacao.candidatos = [
      { id: '', nome: '', partido: '', votos: 30 },
      { id: '', nome: '', partido: '', votos: 19 },
      { id: '', nome: '', partido: '', votos: 51 },
    ]

    const res = precisaSegundoTurno(votacao)
    expect(res).toBe(false)
  })

  it('votacao com tres candidatos com segundo turno', () => {
    votacao.candidatos = [
      { id: '', nome: '', partido: '', votos: 30 },
      { id: '', nome: '', partido: '', votos: 20 },
      { id: '', nome: '', partido: '', votos: 50 },
    ]

    const res = precisaSegundoTurno(votacao)
    expect(res).toBe(true)
  })
})

describe('getCandidatosSegundoTurno', () => {
  let votacao: VotacaoPresidente

  beforeEach(() => {
    votacao = {
      id: '',
      data: new Date(),
      candidatos: [],
      votosBrancos: 0,
      votosNulos: 0,
    }
  })

  it('votacao vazia', () => {
    const res = getCandidatosSegundoTurno(votacao)
    expect(res).toBe(null)
  })

  it('votacao com um candidato', () => {
    votacao.candidatos = [{
      id: '',
      nome: '',
      partido: '',
      votos: 30,
    }]

    const res = getCandidatosSegundoTurno(votacao)
    expect(res).toBe(null)
  })

  it('votacao com tres candidatos sem segundo turno', () => {
    votacao.candidatos = [
      { id: '', nome: '', partido: '', votos: 30 },
      { id: '', nome: '', partido: '', votos: 19 },
      { id: '', nome: '', partido: '', votos: 51 },
    ]

    const res = getCandidatosSegundoTurno(votacao)
    expect(res).toBe(null)
  })

  it('votacao com tres candidatos com segundo turno', () => {
    const c1: Candidato = { id: '01', nome: '', partido: '', votos: 30 }
    const c2: Candidato = { id: '02', nome: '', partido: '', votos: 20 }
    const c3: Candidato = { id: '03', nome: '', partido: '', votos: 50 }

    votacao.candidatos = [c1, c2, c3]

    const res = getCandidatosSegundoTurno(votacao)
    const ans = [c3, c1]

    expect(res).toEqual(ans)
  })
})

describe('resultadoConsultaPublica', () => {
  it.each([
    [[100, 50]],
    [[5, 4]],
    [[90, -1]],
    [[-50, -51]],
    [[Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1]],
  ])('consulta aprovada: %s', ([sim, nao]) => {
    const c: ConsultaPublica = { id: '', local: '', data: new Date(), sim, nao }
    expect(resultadoConsultaPublica(c)).toBe(true)
  })

  it.each([
    [[100, 50]],
    [[5, 4]],
    [[90, -1]],
    [[-50, -51]],
    [[Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1]],
  ])('consulta rejeitada: %s', ([nao, sim]) => {
    const c: ConsultaPublica = { id: '', local: '', data: new Date(), sim, nao }
    expect(resultadoConsultaPublica(c)).toBe(false)
  })
})

describe('getResultadoPrimeiroTurno', () => {
  const candidatoA: Candidato = { id: '1', nome: 'A', partido: 'A', votos: 0 }
  const candidatoB: Candidato = { id: '2', nome: 'B', partido: 'B', votos: 0 }
  const candidatoC: Candidato = { id: '3', nome: 'C', partido: 'C', votos: 0 }

  const votacaoBase: Omit<VotacaoPresidente, 'candidatos'> = {
    id: 'votacao-2026',
    data: new Date('2026-10-04'),
    votosBrancos: 0,
    votosNulos: 0,
  }

  it('deve retornar apenas o candidato vencedor se ele tiver mais de 50% dos votos válidos', () => {
    const candA = { ...candidatoA, votos: 60 }
    const candB = { ...candidatoB, votos: 30 }
    const candC = { ...candidatoC, votos: 10 }

    const votacao: VotacaoPresidente = {
      ...votacaoBase,
      candidatos: [candA, candB, candC],
    }

    const resultado = getResultadoPrimeiroTurno(votacao)

    expect(Array.isArray(resultado)).toBe(false)
    expect(resultado).toEqual(candA)
  })

  it('deve retornar os dois candidatos mais votados em caso de 2º turno (menos de 50% dos votos válidos)', () => {
    const candA = { ...candidatoA, votos: 40 }
    const candB = { ...candidatoB, votos: 35 }
    const candC = { ...candidatoC, votos: 25 }

    const votacao: VotacaoPresidente = {
      ...votacaoBase,
      candidatos: [candA, candB, candC],
    }

    const resultado = getResultadoPrimeiroTurno(votacao)

    expect(Array.isArray(resultado)).toBe(true)
    expect(resultado).toEqual([candA, candB])
  })

  it('deve ir para o 2º turno se o candidato mais votado tiver exatamente 50% dos votos válidos', () => {
    const candA = { ...candidatoA, votos: 50 }
    const candB = { ...candidatoB, votos: 30 }
    const candC = { ...candidatoC, votos: 20 }

    const votacao: VotacaoPresidente = {
      ...votacaoBase,
      candidatos: [candA, candB, candC],
    }

    const resultado = getResultadoPrimeiroTurno(votacao)

    expect(Array.isArray(resultado)).toBe(true)
    expect(resultado).toEqual([candA, candB])
  })

  it('deve desconsiderar votos brancos e nulos no cálculo da porcentagem dos votos válidos', () => {
    const candA = { ...candidatoA, votos: 51 }
    const candB = { ...candidatoB, votos: 49 }

    const votacao: VotacaoPresidente = {
      ...votacaoBase,
      votosBrancos: 500, // não deve afetar o cálculo
      votosNulos: 1000,
      candidatos: [candA, candB],
    }

    const resultado = getResultadoPrimeiroTurno(votacao)

    expect(resultado).toEqual(candA)
  })

  it('deve ordenar os candidatos por votos antes de definir o resultado, independente da ordem da lista enviada', () => {
    const candA = { ...candidatoA, votos: 20 }
    const candB = { ...candidatoB, votos: 45 }
    const candC = { ...candidatoC, votos: 35 }

    const votacao: VotacaoPresidente = {
      ...votacaoBase,
      // Enviando fora da ordem decrescente de votos
      candidatos: [candA, candB, candC],
    }

    const resultado = getResultadoPrimeiroTurno(votacao)

    // Mais votado é B (45%), seguido de C (35%). Deve ir para o 2º turno com [B, C]
    expect(Array.isArray(resultado)).toBe(true)
    expect(resultado).toEqual([candB, candC])
  })
})
