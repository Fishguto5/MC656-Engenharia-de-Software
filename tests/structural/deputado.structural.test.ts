import { EleicaoDeputado, VotosCandidato } from '@/interfaces/eleicaoInterfaces'
import {
  apurarDeputados,
  compararPorVotacao,
  criarVotosLegenda,
} from '@/lib/deputado'
import { describe, expect, it } from 'vitest'

describe('testes estruturais de deputado', () => {
  it('mantem a ordem original quando candidatos empatados não possuem data de nascimento', () => {
    const primeiro = {
      id: 'primeiro',
      nome: 'Primeiro',
      partido: 'P',
      votos: 100,
      numero: 1,
      dataNascimento: undefined as unknown as Date,
    }
    const segundo = {
      id: 'segundo',
      nome: 'Segundo',
      partido: 'P',
      votos: 100,
      numero: 2,
      dataNascimento: undefined as unknown as Date,
    }

    expect(compararPorVotacao(primeiro, segundo)).toBe(0)
  })

  it('mantem cadeiras vagas quando uma agremiacao possui apenas votos de legenda', () => {
    const agora = new Date('2024-08-04')
    const eleicao: EleicaoDeputado = {
      id: 'deputado-federal-2026',
      title: 'Eleição para Deputado Federal 2026',
      description: 'Eleição proporcional',
      startsAt: agora,
      endsAt: agora,
      status: 'closed',
      createdAt: agora,
      updatedAt: agora,
      type: 'deputy',
      uf: 'SP',
      agremiacoes: ['P'],
      candidatos: [],
      votosLegenda: criarVotosLegenda(['P'], [['P', 100]]),
      votosBrancos: 0,
      votosNulos: 0,
    }

    const resultado = apurarDeputados(eleicao, 2)

    expect(resultado.votosValidos).toBe(100)
    expect(resultado.agremiacoes[0].quocientePartidario).toBe(2)
    expect(resultado.agremiacoes[0].eleitos).toEqual([])
    expect(resultado.eleitos).toEqual([])
  })

  it('usa os votos válidos para desempatar médias iguais', () => {
    const agora = new Date('2026-10-04')
    const candidatos: VotosCandidato[] = [
      {
        id: 'p1',
        nome: 'Candidato P1',
        partido: 'P1',
        votos: 100,
        numero: 1,
        dataNascimento: agora,
      },
      {
        id: 'p2-1',
        nome: 'Candidato P2-1',
        partido: 'P2',
        votos: 180,
        numero: 2,
        dataNascimento: agora,
      },
      {
        id: 'p2-2',
        nome: 'Candidato P2-2',
        partido: 'P2',
        votos: 20,
        numero: 3,
        dataNascimento: agora,
      },
    ]
    const eleicao: EleicaoDeputado = {
      id: 'deputado-federal-2026',
      title: 'Eleição para Deputado Federal 2026',
      description: 'Eleição proporcional',
      startsAt: agora,
      endsAt: agora,
      status: 'closed',
      createdAt: agora,
      updatedAt: agora,
      type: 'deputy',
      uf: 'SP',
      agremiacoes: ['P1', 'P2'],
      candidatos,
      votosLegenda: {},
      votosBrancos: 0,
      votosNulos: 0,
    }

    const resultado = apurarDeputados(eleicao, 2)

    expect(resultado.eleitos.map(candidato => candidato.id)).toEqual(['p2-1', 'p2-2'])
    expect(resultado.agremiacoes.find(agremiacao => agremiacao.agremiacao === 'P2')?.vagasSobras).toBe(1)
  })
})
