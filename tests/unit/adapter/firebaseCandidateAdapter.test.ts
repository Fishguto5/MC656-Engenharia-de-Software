import { Candidato } from '@/interfaces/eleicaoInterfaces'
import { CandidatoDocument } from '@/interfaces/firebaseInterfaces'
import { candidateAdapter, CandidatoRawDocument } from '@/lib/adapter/firebaseCandidateAdapter'
import { Timestamp } from 'firebase/firestore'
import { describe, it } from 'node:test'
import { expect, vi } from 'vitest'

describe('fromDB', () => {
  it('Candidato completo e dataNascimento em Timestamp', () => {
    const dataNascimento = new Date('2020-02-02')
    const input: CandidatoRawDocument = {
      id: '2',
      nome: 'Nome',
      partido: 'Partido',
      federacao: 'Federacao',
      dataNascimento: Timestamp.fromDate(dataNascimento),
    }
    const output: Candidato = {
      id: '2',
      nome: 'Nome',
      partido: 'Partido',
      federacao: 'Federacao',
      dataNascimento: dataNascimento,
    }

    expect(candidateAdapter.fromDB(input)).toStrictEqual(output)
  })

  it('Candidato completo e dataNascimento em string', () => {
    const dataNascimento = new Date('2020-02-02')
    const input: CandidatoRawDocument = {
      id: '2',
      nome: 'Nome',
      partido: 'Partido',
      federacao: 'Federacao',
      dataNascimento: '2020-02-02',
    }
    const output: Candidato = {
      id: '2',
      nome: 'Nome',
      partido: 'Partido',
      federacao: 'Federacao',
      dataNascimento: dataNascimento,
    }

    expect(candidateAdapter.fromDB(input)).toStrictEqual(output)
  })

  it('Candidato vazio', () => {
    // Travar o relógio
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2020-01-01T00:00:00Z'))

    const input: CandidatoRawDocument = {
      id: '2',
    }
    const output: Candidato = {
      id: '2',
      nome: 'Nome não informado',
      partido: 'Partido não informado',
      federacao: undefined,
      dataNascimento: new Date('2020-01-01T00:00:00Z'),
    }

    expect(candidateAdapter.fromDB(input)).toStrictEqual(output)
  })
})

describe('toDB', () => {
  it('Candidato completo sem options', () => {
    const dataNascimento = new Date('2020-02-02')
    const input: Candidato = {
      id: '2',
      nome: 'Nome',
      partido: 'Partido',
      federacao: 'Federacao',
      dataNascimento: dataNascimento,
    }

    const output: CandidatoDocument = {
      id: '2',
      nome: 'Nome',
      partido: 'Partido',
      federacao: 'Federacao',
      dataNascimento: Timestamp.fromDate(dataNascimento),
      isActive: true,
    }

    expect(candidateAdapter.toDB(input)).toStrictEqual(output)
  })

  it('Candidato sem federacao sem options', () => {
    const dataNascimento = new Date('2020-02-02')
    const input: Candidato = {
      id: '2',
      nome: 'Nome',
      partido: 'Partido',
      dataNascimento: dataNascimento,
    }

    const output: CandidatoDocument = {
      id: '2',
      nome: 'Nome',
      partido: 'Partido',
      federacao: undefined,
      dataNascimento: Timestamp.fromDate(dataNascimento),
      isActive: true,
    }

    expect(candidateAdapter.toDB(input)).toStrictEqual(output)
  })

  it('Candidato completo com options', () => {
    const dataNascimento = new Date('2020-02-02')
    const output: CandidatoDocument = {
      id: '2',
      nome: 'Nome',
      partido: 'Partido',
      federacao: 'Federacao',
      dataNascimento: Timestamp.fromDate(dataNascimento),
      isActive: false,
    }
    const input: Candidato = {
      id: '2',
      nome: 'Nome',
      partido: 'Partido',
      federacao: 'Federacao',
      dataNascimento: dataNascimento,
    }

    expect(candidateAdapter.toDB(input, { isActive: false })).toStrictEqual(output)
  })
})
