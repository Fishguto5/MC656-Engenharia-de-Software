import {
  type Candidato,
  apurarDeputados,
  calcularQuocienteEleitoral,
  calcularQuocientePartidario,
  getDeputadosEleitos,
  VAGAS_DEPUTADO_FEDERAL,
  VotacaoDeputado,
} from '@/lib/deputado'
import { describe, expect, it } from 'vitest'

function criarCandidato(id: string, partido: string, votos: number, extra: Partial<Candidato> = {}): Candidato {
  return { id, nome: `Candidato ${id}`, partido, votos, ...extra }
}

function criarVotacao(
  vagas: number,
  candidatos: Candidato[],
  votosLegenda: Record<string, number> = {},
  votosBrancos = 0,
  votosNulos = 0,
): VotacaoDeputado {
  return {
    id: 'deputado-federal-2026',
    data: new Date('2026-10-04'),
    vagas,
    candidatos,
    votosLegenda,
    votosBrancos,
    votosNulos,
  }
}

function ids(candidatos: Candidato[]): string[] {
  return candidatos.map(c => c.id)
}

describe('calcularQuocienteEleitoral', () => {
  it('divisao exata', () => {
    expect(calcularQuocienteEleitoral(100, 10)).toBe(10)
  })

  it('fracao igual a meio e desprezada', () => {
    expect(calcularQuocienteEleitoral(105, 10)).toBe(10)
  })

  it('fracao superior a meio equivale a um', () => {
    expect(calcularQuocienteEleitoral(106, 10)).toBe(11)
  })

  it('exemplo do TRE-CE: 46.322 votos validos para 17 vagas', () => {
    expect(calcularQuocienteEleitoral(46_322, 17)).toBe(2_725)
  })

  it('rejeita numero de vagas invalido', () => {
    expect(() => calcularQuocienteEleitoral(100, 0)).toThrow(RangeError)
    expect(() => calcularQuocienteEleitoral(100, 2.5)).toThrow(RangeError)
  })
})

describe('calcularQuocientePartidario', () => {
  it('despreza a fracao', () => {
    expect(calcularQuocientePartidario(41_000, 10_000)).toBe(4)
    expect(calcularQuocientePartidario(9_999, 10_000)).toBe(0)
  })

  it('quociente eleitoral zerado nao gera vagas', () => {
    expect(calcularQuocientePartidario(500, 0)).toBe(0)
  })
})

describe('VAGAS_DEPUTADO_FEDERAL', () => {
  it('soma 513 cadeiras em 27 unidades da federacao', () => {
    const vagas = Object.values(VAGAS_DEPUTADO_FEDERAL)

    expect(vagas).toHaveLength(27)
    expect(vagas.reduce((acc, v) => acc + v, 0)).toBe(513)
  })

  it('respeita o minimo de 8 e o maximo de 70 por unidade', () => {
    for (const vagas of Object.values(VAGAS_DEPUTADO_FEDERAL)) {
      expect(vagas).toBeGreaterThanOrEqual(8)
      expect(vagas).toBeLessThanOrEqual(70)
    }
  })
})

describe('apurarDeputados - eleicao com quociente, clausula de 10% e sobras', () => {
  // 8 vagas e 80.000 votos validos, logo QE = 10.000 (10% = 1.000; 80% = 8.000; 20% = 2.000).
  // A Federacao Alfa reune os partidos A1 e A2 e conta como uma unica agremiacao.
  const candidatos = [
    criarCandidato('a1', 'A1', 9_000, { federacao: 'Federacao Alfa' }),
    criarCandidato('a2', 'A2', 8_000, { federacao: 'Federacao Alfa' }),
    criarCandidato('a3', 'A1', 7_000, { federacao: 'Federacao Alfa' }),
    criarCandidato('a4', 'A2', 6_000, { federacao: 'Federacao Alfa' }),
    criarCandidato('a5', 'A1', 3_000, { federacao: 'Federacao Alfa' }),
    criarCandidato('a6', 'A2', 1_500, { federacao: 'Federacao Alfa' }),
    criarCandidato('b1', 'PB', 12_000),
    criarCandidato('b2', 'PB', 900),
    criarCandidato('b3', 'PB', 500),
    criarCandidato('c1', 'PC', 5_500),
    criarCandidato('c2', 'PC', 1_800),
    criarCandidato('c3', 'PC', 600),
    criarCandidato('d1', 'PD', 3_000),
    criarCandidato('d2', 'PD', 500),
  ]
  const votosLegenda = { 'Federacao Alfa': 6_500, 'PB': 9_600, 'PC': 3_600, 'PD': 1_000 }
  const votacao = criarVotacao(8, candidatos, votosLegenda, 3_000, 2_000)

  const res = apurarDeputados(votacao)
  const porNome = (nome: string) => res.agremiacoes.find(a => a.agremiacao === nome)

  it('calcula votos validos e quociente eleitoral sem contar brancos e nulos', () => {
    expect(res.votosValidos).toBe(80_000)
    expect(res.quocienteEleitoral).toBe(10_000)
  })

  it('agrupa os partidos da federacao em uma unica agremiacao', () => {
    expect(res.agremiacoes).toHaveLength(4)
    expect(porNome('Federacao Alfa')?.votosNominais).toBe(34_500)
    expect(porNome('Federacao Alfa')?.votosValidos).toBe(41_000)
  })

  it('calcula o quociente partidario de cada agremiacao', () => {
    expect(res.agremiacoes.map(a => a.quocientePartidario)).toEqual([4, 2, 1, 0])
  })

  it('federacao fica com quatro vagas por quociente e uma por sobra (20% do QE)', () => {
    const alfa = porNome('Federacao Alfa')

    expect(alfa?.vagasQuociente).toBe(4)
    expect(alfa?.vagasSobras).toBe(1)
    expect(ids(alfa?.eleitos ?? [])).toEqual(['a1', 'a2', 'a3', 'a4', 'a5'])
  })

  it('candidato abaixo de 10% do QE nao ocupa vaga de quociente, mas pode ocupar sobra', () => {
    const pb = porNome('PB')

    expect(pb?.quocientePartidario).toBe(2)
    expect(pb?.vagasQuociente).toBe(1)
    expect(pb?.vagasSobras).toBe(1)
    expect(ids(pb?.eleitos ?? [])).toEqual(['b1', 'b2'])
  })

  it('agremiacao sem quociente partidario nao elege', () => {
    expect(porNome('PC')?.vagasQuociente).toBe(1)
    expect(ids(porNome('PC')?.eleitos ?? [])).toEqual(['c1'])
    expect(porNome('PD')?.eleitos).toEqual([])
  })

  it('preenche exatamente as vagas, em ordem decrescente de votacao', () => {
    expect(res.eleitos).toHaveLength(8)
    expect(ids(res.eleitos)).toEqual(['b1', 'a1', 'a2', 'a3', 'a4', 'c1', 'a5', 'b2'])
  })

  it('getDeputadosEleitos retorna apenas os eleitos', () => {
    expect(getDeputadosEleitos(votacao)).toEqual(res.eleitos)
  })
})

describe('apurarDeputados - votacao minima de 10% do quociente eleitoral', () => {
  it('candidato com exatamente 10% do QE ocupa a vaga de quociente', () => {
    // 20.000 votos validos / 2 vagas = QE 10.000; 10% = 1.000 votos.
    const candidatos = [criarCandidato('c1', 'P', 5_000), criarCandidato('c2', 'P', 1_000)]
    const res = apurarDeputados(criarVotacao(2, candidatos, { P: 14_000 }))

    expect(res.quocienteEleitoral).toBe(10_000)
    expect(res.agremiacoes[0].vagasQuociente).toBe(2)
    expect(res.agremiacoes[0].vagasSobras).toBe(0)
  })

  it('candidato com menos de 10% do QE nao ocupa vaga de quociente', () => {
    // 19.999 votos validos / 2 vagas = QE 9.999; 10% = 999,9 votos.
    const candidatos = [criarCandidato('c1', 'P', 5_000), criarCandidato('c2', 'P', 999)]
    const res = apurarDeputados(criarVotacao(2, candidatos, { P: 14_000 }))

    expect(res.quocienteEleitoral).toBe(9_999)
    expect(res.agremiacoes[0].vagasQuociente).toBe(1)
    expect(res.agremiacoes[0].vagasSobras).toBe(1)
  })
})

describe('apurarDeputados - nenhum partido atinge o quociente eleitoral', () => {
  // 4 partidos com 1.000 votos validos cada e 3 vagas: QE = 1.333.
  // Nenhum chega a 80% do QE, entao todos disputam as vagas por maior media.
  const candidatos = [
    criarCandidato('p1', 'P1', 900),
    criarCandidato('p2', 'P2', 700),
    criarCandidato('p3', 'P3', 500),
    criarCandidato('p4', 'P4', 300),
  ]
  const votosLegenda = { P1: 100, P2: 300, P3: 500, P4: 700 }

  it('distribui as cadeiras por maior media, sem cair na regra dos mais votados', () => {
    const res = apurarDeputados(criarVotacao(3, candidatos, votosLegenda))

    expect(res.quocienteEleitoral).toBe(1_333)
    expect(res.agremiacoes.every(a => a.quocientePartidario === 0)).toBe(true)
    expect(res.agremiacoes.every(a => a.vagasQuociente === 0)).toBe(true)
    expect(ids(res.eleitos)).toEqual(['p1', 'p2', 'p3'])
  })
})

describe('apurarDeputados - desempates', () => {
  it('empate de votos no mesmo partido elege o candidato mais idoso', () => {
    const jovem = criarCandidato('jovem', 'P', 500, { dataNascimento: new Date('1990-01-01') })
    const idoso = criarCandidato('idoso', 'P', 500, { dataNascimento: new Date('1962-09-12') })

    const res = apurarDeputados(criarVotacao(1, [jovem, idoso]))

    expect(ids(res.eleitos)).toEqual(['idoso'])
  })
})

describe('apurarDeputados - casos limite', () => {
  it('sem votos validos ninguem e eleito', () => {
    const res = apurarDeputados(criarVotacao(5, [criarCandidato('c1', 'P', 0)], {}, 100, 50))

    expect(res.votosValidos).toBe(0)
    expect(res.quocienteEleitoral).toBe(0)
    expect(res.eleitos).toEqual([])
  })

  it('cadeiras sem candidatos suficientes ficam vagas', () => {
    const res = apurarDeputados(criarVotacao(3, [criarCandidato('c1', 'P', 900)]))

    expect(res.quocienteEleitoral).toBe(300)
    expect(res.agremiacoes[0].quocientePartidario).toBe(3)
    expect(ids(res.eleitos)).toEqual(['c1'])
  })

  it('votos de legenda de um partido sem candidatos entram nos votos validos', () => {
    const res = apurarDeputados(criarVotacao(1, [criarCandidato('c1', 'P', 100)], { Q: 100 }))

    expect(res.votosValidos).toBe(200)
    expect(res.agremiacoes).toHaveLength(2)
  })

  it('rejeita numero de vagas invalido', () => {
    expect(() => apurarDeputados(criarVotacao(0, []))).toThrow(RangeError)
  })

  it('rejeita quantidade de votos invalida', () => {
    expect(() => apurarDeputados(criarVotacao(2, [criarCandidato('c1', 'P', -1)]))).toThrow(RangeError)
    expect(() => apurarDeputados(criarVotacao(2, [], { P: -5 }))).toThrow(RangeError)
    expect(() => apurarDeputados(criarVotacao(2, [], {}, -1))).toThrow(RangeError)
  })

  it('rejeita quociente eleitoral inconsistente com as vagas', () => {
    // 20 votos para 8 vagas: QE = 2 e o partido teria 10 vagas por quociente.
    expect(() => apurarDeputados(criarVotacao(8, [criarCandidato('c1', 'P', 20)]))).toThrow(RangeError)
  })
})
