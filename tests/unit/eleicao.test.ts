import {
  Candidato,
  getCandidatosSegundoTurno,
  precisaSegundoTurno,
  VotacaoPresidente,

  type ConsultaPublica,
  resultadoConsultaPublica
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

describe("resultadoConsultaPublica", () => {
  it.each([
    [[100, 50]],
    [[5, 4]],
    [[90, -1]],
    [[-50, -51]],
    [[Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1]]
  ])("consulta aprovada: %s", ([sim, nao]) => {
    const c: ConsultaPublica = {id: "", local: "", data: new Date(), sim, nao}
    expect(resultadoConsultaPublica(c)).toBe(true)
  })

  it.each([
    [[100, 50]],
    [[5, 4]],
    [[90, -1]],
    [[-50, -51]],
    [[Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1]]
  ])("consulta rejeitada: %s", ([nao, sim]) => {
    const c: ConsultaPublica = {id: "", local: "", data: new Date(), sim, nao}
    expect(resultadoConsultaPublica(c)).toBe(false)
  })
})
