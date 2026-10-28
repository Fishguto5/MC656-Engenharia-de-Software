import { Candidato } from '@/interfaces/eleicaoInterfaces'
import { CANDIDATES_COLLECTION, firebaseCandidateRepository } from '@/lib/repository/firebaseCandidatesRepository'
import { addDoc, collection, doc, DocumentSnapshot, getDoc, getDocs, QuerySnapshot, updateDoc, writeBatch } from 'firebase/firestore'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mockups globais do Firestore
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>()

  const mockDoc = vi.fn((...args: unknown[]) => {
    if (args.length === 1) {
      return { id: 'auto-generated-id-123' }
    }
    const docId = typeof args[2] === 'string' ? args[2] : 'mock-id'
    return { id: docId }
  })

  const mockBatch = {
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  }

  return {
    ...actual,
    query: vi.fn(),
    orderBy: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    doc: mockDoc,
    updateDoc: vi.fn().mockResolvedValue(undefined),
    addDoc: vi.fn().mockResolvedValue({ id: 'new-doc-id' }),
    collection: vi.fn().mockReturnValue('mock-collection-ref'),
    writeBatch: vi.fn().mockReturnValue(mockBatch),
  }
})

// Testes
describe('FirebaseCandidateRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findAll', () => {
    it('deve buscar e mapear a lista de candidatos corretamente', async () => {
      const mockQuerySnapshot = {
        docs: [
          {
            id: '1',
            data: () => ({
              id: '1',
              nome: 'Ana Silva',
              partido: 'Partido A',
            }),
          },
          {
            id: '2',
            data: () => ({
              id: '2',
              nome: 'Carlos Souza',
              partido: 'Partido B',
            }),
          },
        ],
        empty: false,
        size: 2,
      } as unknown as QuerySnapshot

      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot)

      const candidatos = await firebaseCandidateRepository.findAll()

      expect(getDocs).toHaveBeenCalledTimes(1)
      expect(candidatos).toHaveLength(2)
      expect(candidatos[0]).toMatchObject({
        id: '1',
        nome: 'Ana Silva',
        partido: 'Partido A',
      })
      expect(candidatos[1].nome).toBe('Carlos Souza')
    })

    it('deve retornar lista vazia quando não houver candidatos', async () => {
      const mockQuerySnapshot = {
        docs: [],
        empty: true,
        size: 0,
      } as unknown as QuerySnapshot

      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot)

      const candidatos = await firebaseCandidateRepository.findAll()

      expect(getDocs).toHaveBeenCalledTimes(1)
      expect(candidatos).toHaveLength(0)
    })
  })

  describe('findAllActive', () => {
    it('deve buscar e mapear a lista de candidatos ativos corretamente', async () => {
      const mockQuerySnapshot = {
        docs: [
          {
            id: '1',
            data: () => ({
              id: '1',
              nome: 'Ana Silva',
              partido: 'Partido A',
              isActive: true,
            }),
          },
        ],
        empty: false,
        size: 1,
      } as unknown as QuerySnapshot

      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot)

      const candidatos = await firebaseCandidateRepository.findAllActive()

      expect(getDocs).toHaveBeenCalledTimes(1)
      expect(candidatos).toHaveLength(1)
      expect(candidatos[0]).toMatchObject({
        id: '1',
        nome: 'Ana Silva',
        partido: 'Partido A',
      })
    })

    it('deve retornar lista vazia quando não houver candidatos ativos', async () => {
      const mockQuerySnapshot = {
        docs: [],
        empty: true,
        size: 0,
      } as unknown as QuerySnapshot

      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot)

      const candidatos = await firebaseCandidateRepository.findAll()

      expect(getDocs).toHaveBeenCalledTimes(1)
      expect(candidatos).toHaveLength(0)
    })
  })

  describe('findById', () => {
    it('deve retornar o candidato mapeado quando o documento existir', async () => {
      const mockSnapshot = {
        exists: () => true,
        id: '123',
        data: () => ({
          nome: 'Maria Oliveira',
          partido: 'Partido X',
          dataNascimento: '1992-04-10',
        }),
      } as unknown as DocumentSnapshot

      vi.mocked(getDoc).mockResolvedValue(mockSnapshot)

      const candidato = await firebaseCandidateRepository.findById('123')

      expect(doc).toHaveBeenCalledWith(expect.any(Object), CANDIDATES_COLLECTION, '123')
      expect(getDoc).toHaveBeenCalledTimes(1)
      expect(candidato).toMatchObject({
        id: '123',
        nome: 'Maria Oliveira',
        partido: 'Partido X',
      })
    })

    it('deve retornar null quando o documento NÃO existir', async () => {
      const mockSnapshot = {
        exists: () => false,
      } as unknown as DocumentSnapshot

      vi.mocked(getDoc).mockResolvedValue(mockSnapshot)

      const candidato = await firebaseCandidateRepository.findById('999')

      expect(candidato).toBeNull()
    })
  })

  describe('Métodos de Escrita', () => {
    it('deve desativar o candidato corretamente (deactivate)', async () => {
      await firebaseCandidateRepository.deactivate('123')

      expect(doc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        '123',
      )
      expect(updateDoc).toHaveBeenCalledWith(
        { id: '123' },
        { isActive: false },
      )
    })

    it('deve criar um novo candidato corretamente (create)', async () => {
      const novoCandidato: Candidato = {
        id: '',
        nome: 'João da Silva',
        partido: 'Partido A',
        federacao: undefined,
        dataNascimento: new Date('1990-01-01'),
      }

      await firebaseCandidateRepository.create(novoCandidato)

      expect(collection).toHaveBeenCalledWith(expect.any(Object), expect.any(String))
      expect(addDoc).toHaveBeenCalledTimes(1)
      expect(addDoc).toHaveBeenCalledWith(
        'mock-collection-ref',
        expect.objectContaining({
          nome: 'João da Silva',
          partido: 'Partido A',
          isActive: true,
        }),
      )
    })

    it('deve criar múltiplos candidatos em lote (createBatch)', async () => {
      const listaCandidatos: Candidato[] = [
        {
          id: '',
          nome: 'Candidato 1',
          partido: 'Partido A',
          dataNascimento: new Date('1985-05-10'),
        },
      ]

      const resultado = await firebaseCandidateRepository.createBatch(listaCandidatos)

      expect(resultado[0].id).toBe('auto-generated-id-123')

      const batchInstance = writeBatch({} as Parameters<typeof writeBatch>[0])
      expect(batchInstance.set).toHaveBeenCalledTimes(1)
      expect(batchInstance.commit).toHaveBeenCalledTimes(1)
    })

    it('deve atualizar os dados do candidato (update)', async () => {
      const candidatoAtualizado: Candidato = {
        id: '456',
        nome: 'Maria Atualizada',
        partido: 'Partido B',
        dataNascimento: new Date('1995-08-20'),
      }

      await firebaseCandidateRepository.update(candidatoAtualizado)

      expect(doc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        '456',
      )
      expect(updateDoc).toHaveBeenCalledWith(
        { id: '456' },
        expect.objectContaining({
          nome: 'Maria Atualizada',
          partido: 'Partido B',
        }),
      )
    })
  })
})
