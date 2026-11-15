import { Candidato } from '@/interfaces/eleicaoInterfaces'
import { firebaseCandidate } from '@/lib/repository/firebaseCandidatesRepository'
import {
  addDoc,
  DocumentSnapshot,
  getDoc,
  getDocs,
  QuerySnapshot,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>()

  return {
    ...actual,
    query: vi.fn(),
    orderBy: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    doc: vi.fn((...args: unknown[]) => {
      if (args.length === 1) return { id: 'auto-generated-id-123' }

      const id = typeof args[2] === 'string' ? args[2] : 'mock-id'
      return { id }
    }),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    addDoc: vi.fn().mockResolvedValue({ id: 'new-doc-id' }),
    collection: vi.fn().mockReturnValue('mock-collection-ref'),
    writeBatch: vi.fn().mockImplementation(() => ({
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    })),
  }
})

describe('testes estruturais de firebaseCandidateRepository', () => {
  const MOCK_TODAY = new Date('2026-10-30T12:00:00')
  const candidato = (overrides: Partial<Candidato> = {}): Candidato => ({
    id: '',
    nome: 'Candidato',
    partido: 'P',
    dataNascimento: new Date('2000-01-01'),
    ...overrides,
  })
  const documento = (id: string, dados: Record<string, unknown> = {}) => ({
    id,
    data: () => ({
      nome: 'Candidato',
      partido: 'P',
      dataNascimento: '1990-01-01',
      isActive: true,
      ...dados,
    }),
  })
  const snapshot = (docs: unknown[]) => ({ docs }) as unknown as QuerySnapshot
  const batch = (commit = vi.fn().mockResolvedValue(undefined)) => ({
    set: vi.fn(),
    commit,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(MOCK_TODAY)
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as unknown as QuerySnapshot)
    vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as unknown as DocumentSnapshot)
    vi.mocked(updateDoc).mockResolvedValue(undefined)
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-doc-id' } as unknown as Awaited<ReturnType<typeof addDoc>>)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('ignora documentos inválidos ao buscar todos os candidatos', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshot([
      documento('valido', { nome: 'Candidato Válido' }),
      documento('invalido', { nome: undefined }),
    ]))

    const candidatos = await firebaseCandidate.findAll()

    expect(candidatos).toHaveLength(1)
    expect(candidatos[0]).toMatchObject({ id: 'valido', nome: 'Candidato Válido' })
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('invalido'),
      expect.anything(),
    )
  })

  it('retorna null quando o documento encontrado possui dados inválidos', async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      id: 'invalido',
      data: () => documento('invalido', { nome: undefined }).data(),
    } as unknown as DocumentSnapshot)

    const candidato = await firebaseCandidate.findById('invalido')

    expect(candidato).toBeNull()
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('invalido'),
      expect.anything(),
    )
  })

  it('retorna vazio sem consultar o Firestore quando a lista de IDs está vazia', async () => {
    const candidatos = await firebaseCandidate.findBatchById([])

    expect(candidatos).toEqual([])
    expect(getDocs).not.toHaveBeenCalled()
  })

  it('divide a consulta em lotes de no máximo 30 IDs e combina os resultados', async () => {
    const ids = Array.from({ length: 31 }, (_, index) => `id-${index + 1}`)
    vi.mocked(getDocs)
      .mockResolvedValueOnce(snapshot([documento('id-1', { nome: 'Candidato 1', partido: 'P1' })]))
      .mockResolvedValueOnce(snapshot([documento('id-31', { nome: 'Candidato 31', partido: 'P2' })]))

    const candidatos = await firebaseCandidate.findBatchById(ids)
    const lotes = vi.mocked(where).mock.calls.map(call => call[2] as string[])

    expect(getDocs).toHaveBeenCalledTimes(2)
    expect(lotes.map(lote => lote.length)).toEqual([30, 1])
    expect(candidatos.map(candidato => candidato.id)).toEqual(['id-1', 'id-31'])
  })

  it('traduz a falha de desativação para um erro do domínio', async () => {
    vi.mocked(updateDoc).mockRejectedValueOnce(new Error('Firestore indisponível'))

    await expect(firebaseCandidate.deactivate('123'))
      .rejects.toThrow('Não foi possível desativar o candidato 123.')

    expect(updateDoc).toHaveBeenCalledWith({ id: '123' }, { isActive: false })
  })

  it('traduz a falha de criação para um erro do domínio', async () => {
    vi.mocked(addDoc).mockRejectedValueOnce(new Error('Firestore indisponível'))
    const novoCandidato = candidato({ dataNascimento: new Date('2005-10-30T00:00:00') })

    await expect(firebaseCandidate.create(novoCandidato))
      .rejects.toThrow('Não foi possível salvar o novo candidato.')
  })

  it('não cria candidato que está um dia abaixo da idade mínima', async () => {
    const jovem = candidato({ dataNascimento: new Date('2005-10-31T00:00:00') })

    await firebaseCandidate.create(jovem)

    expect(addDoc).not.toHaveBeenCalled()
  })

  it('cria candidato nascido exatamente na data-limite permitida', async () => {
    const noLimite = candidato({
      nome: 'Candidato no Limite',
      dataNascimento: new Date('2005-10-30T00:00:00'),
    })

    await firebaseCandidate.create(noLimite)

    expect(addDoc).toHaveBeenCalledWith(
      'mock-collection-ref',
      expect.objectContaining({ nome: 'Candidato no Limite', isActive: true }),
    )
  })

  it('traduz a falha de commit do cadastro em lote', async () => {
    const candidatoEmLote = candidato({ nome: 'Candidato em Lote' })
    const lote = batch(vi.fn().mockRejectedValue(new Error('Firestore indisponível')))
    vi.mocked(writeBatch).mockReturnValueOnce(lote as unknown as ReturnType<typeof writeBatch>)

    await expect(firebaseCandidate.saveBatch([candidatoEmLote]))
      .rejects.toThrow('Não foi possível concluir o cadastro em lote dos candidatos.')

    expect(lote.set).toHaveBeenCalledTimes(1)
    expect(lote.commit).toHaveBeenCalledTimes(1)
  })

  it('inclui no batch somente candidatos que atendem à idade mínima', async () => {
    const candidatos = [
      candidato({ nome: 'Candidato Válido', dataNascimento: new Date('2005-10-30T00:00:00') }),
      candidato({ nome: 'Candidato Inválido', dataNascimento: new Date('2005-10-31T00:00:00') }),
    ]
    const lote = batch()
    vi.mocked(writeBatch).mockReturnValueOnce(lote as unknown as ReturnType<typeof writeBatch>)

    const resultado = await firebaseCandidate.saveBatch(candidatos)

    expect(resultado).toHaveLength(1)
    expect(resultado[0].nome).toBe('Candidato Válido')
    expect(lote.set).toHaveBeenCalledTimes(1)
    expect(lote.commit).toHaveBeenCalledTimes(1)
  })

  it('não atualiza candidato abaixo da idade mínima', async () => {
    const jovem = candidato({ id: '123', dataNascimento: new Date('2005-10-31T00:00:00') })

    await firebaseCandidate.update(jovem)

    expect(updateDoc).not.toHaveBeenCalled()
  })

  it('traduz a falha de atualização para um erro do domínio', async () => {
    vi.mocked(updateDoc).mockRejectedValueOnce(new Error('Firestore indisponível'))
    const atualizado = candidato({ id: '123', nome: 'Candidato Atualizado' })

    await expect(firebaseCandidate.update(atualizado))
      .rejects.toThrow('Não foi possível atualizar os dados do candidato 123.')
  })
})
