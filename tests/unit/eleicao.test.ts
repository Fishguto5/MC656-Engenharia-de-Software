import {
  ConsultaPublica,
  EleicaoPresidente,
  VotosCandidato,
} from '@/interfaces/eleicaoInterfaces'
import {
  getCandidatosSegundoTurno,
  getResultadoPrimeiroTurno,
  precisaSegundoTurno,
  resultadoConsultaPublica,
} from '@/lib/eleicao'
import { beforeEach, describe, expect, it } from 'vitest'

describe('precisaSegundoTurno', () => {
  let eleicao: EleicaoPresidente

  beforeEach(() => {
    const agora = new Date()
    eleicao = {
      id: '',
      title: '',
      description: '',
      startsAt: agora,
      endsAt: agora,
      status: 'closed',
      createdAt: agora,
      updatedAt: agora,
      type: 'president',
      turno: 1,
      candidatos: [],
      votosBrancos: 0,
      votosNulos: 0,
    }
  })

  it('eleicao vazia', () => {
    const res = precisaSegundoTurno(eleicao)
    expect(res).toBe(false)
  })

  it('eleicao com um candidato', () => {
    eleicao.candidatos = [{
      id: '',
      nome: '',
      partido: '',
      numero: 13,
      votos: 30,
      dataNascimento: new Date(),
    }]

    const res = precisaSegundoTurno(eleicao)
    expect(res).toBe(false)
  })

  it('eleicao com tres candidatos sem segundo turno', () => {
    eleicao.candidatos = [
      { id: '', nome: '', partido: '', numero: 13, votos: 30, dataNascimento: new Date() },
      { id: '', nome: '', partido: '', numero: 22, votos: 19, dataNascimento: new Date() },
      { id: '', nome: '', partido: '', numero: 45, votos: 51, dataNascimento: new Date() },
    ]

    const res = precisaSegundoTurno(eleicao)
    expect(res).toBe(false)
  })

  it('eleicao com tres candidatos com segundo turno', () => {
    eleicao.candidatos = [
      { id: '', nome: '', partido: '', numero: 13, votos: 30, dataNascimento: new Date() },
      { id: '', nome: '', partido: '', numero: 22, votos: 20, dataNascimento: new Date() },
      { id: '', nome: '', partido: '', numero: 45, votos: 50, dataNascimento: new Date() },
    ]

    const res = precisaSegundoTurno(eleicao)
    expect(res).toBe(true)
  })
})

describe('getCandidatosSegundoTurno', () => {
  let eleicao: EleicaoPresidente

  beforeEach(() => {
    const agora = new Date()
    eleicao = {
      id: '',
      title: '',
      description: '',
      startsAt: agora,
      endsAt: agora,
      status: 'closed',
      createdAt: agora,
      updatedAt: agora,
      type: 'president',
      turno: 1,
      candidatos: [],
      votosBrancos: 0,
      votosNulos: 0,
    }
  })

  it('eleicao vazia', () => {
    const res = getCandidatosSegundoTurno(eleicao)
    expect(res).toBe(null)
  })

  it('eleicao com um candidato', () => {
    eleicao.candidatos = [{
      id: '',
      nome: '',
      partido: '',
      numero: 13,
      votos: 30,
      dataNascimento: new Date(),
    }]

    const res = getCandidatosSegundoTurno(eleicao)
    expect(res).toBe(null)
  })

  it('eleicao com tres candidatos sem segundo turno', () => {
    eleicao.candidatos = [
      { id: '', nome: '', partido: '', numero: 13, votos: 30, dataNascimento: new Date() },
      { id: '', nome: '', partido: '', numero: 22, votos: 19, dataNascimento: new Date() },
      { id: '', nome: '', partido: '', numero: 45, votos: 51, dataNascimento: new Date() },
    ]

    const res = getCandidatosSegundoTurno(eleicao)
    expect(res).toBe(null)
  })

  it('eleicao com tres candidatos com segundo turno', () => {
    const c1: VotosCandidato = { id: '01', nome: '', partido: '', numero: 13, votos: 30, dataNascimento: new Date() }
    const c2: VotosCandidato = { id: '02', nome: '', partido: '', numero: 22, votos: 20, dataNascimento: new Date() }
    const c3: VotosCandidato = { id: '03', nome: '', partido: '', numero: 45, votos: 50, dataNascimento: new Date() }

    eleicao.candidatos = [c1, c2, c3]

    const res = getCandidatosSegundoTurno(eleicao)
    const ans = [c3, c1]

    expect(res).toEqual(ans)
  })
})

describe('resultadoConsultaPublica', () => {
  const agora = new Date()
  const baseConsulta: Omit<ConsultaPublica, 'sim' | 'nao'> = {
    id: '',
    title: '',
    description: '',
    startsAt: agora,
    endsAt: agora,
    status: 'closed',
    createdAt: agora,
    updatedAt: agora,
    type: 'public-consultation',
    local: 'SP',
  }

  it.each([
    [[100, 50]],
    [[5, 4]],
    [[90, -1]],
    [[-50, -51]],
    [[Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1]],
  ])('consulta aprovada: %s', ([sim, nao]) => {
    const c: ConsultaPublica = { ...baseConsulta, sim, nao }
    expect(resultadoConsultaPublica(c)).toBe(true)
  })

  it.each([
    [[100, 50]],
    [[5, 4]],
    [[90, -1]],
    [[-50, -51]],
    [[Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1]],
  ])('consulta rejeitada: %s', ([nao, sim]) => {
    const c: ConsultaPublica = { ...baseConsulta, sim, nao }
    expect(resultadoConsultaPublica(c)).toBe(false)
  })
})

describe('getResultadoPrimeiroTurno', () => {
  const candidatoA: VotosCandidato = { id: '1', nome: 'A', partido: 'A', numero: 10, votos: 0, dataNascimento: new Date() }
  const candidatoB: VotosCandidato = { id: '2', nome: 'B', partido: 'B', numero: 20, votos: 0, dataNascimento: new Date() }
  const candidatoC: VotosCandidato = { id: '3', nome: 'C', partido: 'C', numero: 30, votos: 0, dataNascimento: new Date() }

  const agora = new Date('2026-10-04')
  const eleicaoBase: Omit<EleicaoPresidente, 'candidatos'> = {
    id: 'eleicao-2026',
    title: 'Eleição Presidencial 2026',
    description: 'Primeiro Turno',
    startsAt: agora,
    endsAt: agora,
    status: 'closed',
    createdAt: agora,
    updatedAt: agora,
    type: 'president',
    turno: 1,
    votosBrancos: 0,
    votosNulos: 0,
  }

  it('deve retornar apenas o candidato vencedor se ele tiver mais de 50% dos votos válidos', () => {
    const candA = { ...candidatoA, votos: 60 }
    const candB = { ...candidatoB, votos: 30 }
    const candC = { ...candidatoC, votos: 10 }

    const eleicao: EleicaoPresidente = {
      ...eleicaoBase,
      candidatos: [candA, candB, candC],
    }

    const resultado = getResultadoPrimeiroTurno(eleicao)

    expect(Array.isArray(resultado)).toBe(false)
    expect(resultado).toEqual(candA)
  })

  it('deve retornar os dois candidatos mais votados em caso de 2º turno (menos de 50% dos votos válidos)', () => {
    const candA = { ...candidatoA, votos: 40 }
    const candB = { ...candidatoB, votos: 35 }
    const candC = { ...candidatoC, votos: 25 }

    const eleicao: EleicaoPresidente = {
      ...eleicaoBase,
      candidatos: [candA, candB, candC],
    }

    const resultado = getResultadoPrimeiroTurno(eleicao)

    expect(Array.isArray(resultado)).toBe(true)
    expect(resultado).toEqual([candA, candB])
  })

  it('deve ir para o 2º turno se o candidato mais votado tiver exatamente 50% dos votos válidos', () => {
    const candA = { ...candidatoA, votos: 50 }
    const candB = { ...candidatoB, votos: 30 }
    const candC = { ...candidatoC, votos: 20 }

    const eleicao: EleicaoPresidente = {
      ...eleicaoBase,
      candidatos: [candA, candB, candC],
    }

    const resultado = getResultadoPrimeiroTurno(eleicao)

    expect(Array.isArray(resultado)).toBe(true)
    expect(resultado).toEqual([candA, candB])
  })

  it('deve desconsiderar votos brancos e nulos no cálculo da porcentagem dos votos válidos', () => {
    const candA = { ...candidatoA, votos: 51 }
    const candB = { ...candidatoB, votos: 49 }

    const eleicao: EleicaoPresidente = {
      ...eleicaoBase,
      votosBrancos: 500, // não deve afetar o cálculo
      votosNulos: 1000,
      candidatos: [candA, candB],
    }

    const resultado = getResultadoPrimeiroTurno(eleicao)

    expect(resultado).toEqual(candA)
  })

  it('deve ordenar os candidatos por votos antes de definir o resultado, independente da ordem da lista enviada', () => {
    const candA = { ...candidatoA, votos: 20 }
    const candB = { ...candidatoB, votos: 45 }
    const candC = { ...candidatoC, votos: 35 }

    const eleicao: EleicaoPresidente = {
      ...eleicaoBase,
      // Enviando fora da ordem decrescente de votos
      candidatos: [candA, candB, candC],
    }

    const resultado = getResultadoPrimeiroTurno(eleicao)

    // Mais votado é B (45%), seguido de C (35%). Deve ir para o 2º turno com [B, C]
    expect(Array.isArray(resultado)).toBe(true)
    expect(resultado).toEqual([candB, candC])
  })
})
