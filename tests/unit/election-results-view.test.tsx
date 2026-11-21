// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/firebase', () => ({ firestore: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((...parts: string[]) => parts.join('/')),
  doc: vi.fn((...parts: string[]) => parts.join('/')),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'closed' }) }))
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }))

import { getDoc, getDocs } from 'firebase/firestore'
import ElectionsClientView from '@/app/(user)/eleicoes/ElectionsClientView'
import ElectionResultPage from '@/app/(user)/eleicoes/[id]/resultado/page'

const start = '2026-11-01T12:00:00.000Z'
const end = '2026-11-02T12:00:00.000Z'
const published = '2026-11-03T12:00:00.000Z'

const elections = [
  { id: 'open', data: () => ({ title: 'Presidente aberta', type: 'president', status: 'open', startsAt: start, endsAt: end }) },
  { id: 'closed', data: () => ({ title: 'Deputado SP', type: 'deputy', uf: 'SP', status: 'closed', startsAt: start, endsAt: end, publishedAllow: true, resultsPublishedAt: published }) },
  { id: 'pending', data: () => ({ title: 'Consulta Brasil', type: 'public-consultation', local: 'Brasil', status: 'closed', startsAt: start, endsAt: end }) },
  { id: 'other', data: () => ({ title: 'Deputado RJ', type: 'deputy', uf: 'RJ', status: 'closed', startsAt: start, endsAt: end }) },
]

const consolidated = {
  electionId: 'closed', title: 'Deputado SP', type: 'deputy', turno: 1, endsAt: end, publishedAt: published,
  votosValidos: 4, votosBrancos: 0, votosNulos: 0, totalVotos: 4,
  candidatos: [{ id: 'c1', nome: 'Ana', partido: 'P', numero: 10, votos: 4, eleito: true }],
  segundoTurno: false, quocienteEleitoral: 4, votosLegenda: 0,
  agremiacoes: [{ nome: 'P', votosValidos: 4, vagas: 1 }], consulta: null,
}

beforeEach(() => {
  sessionStorage.setItem('voter:session', JSON.stringify({ cpf: '12345678901', name: 'Eleitor', uf: 'SP' }))
  vi.mocked(getDocs).mockResolvedValue({ docs: elections } as never)
  vi.mocked(getDoc).mockImplementation(async (path) => {
    if (String(path).endsWith('/resultados/consolidado')) return { exists: () => true, data: () => consolidated } as never
    return { exists: () => true, data: elections[1].data } as never
  })
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.resetAllMocks()
})

describe('visualização dos resultados', () => {
  it('mantém o filtro de UF e oferece voto e resultado nos cards correspondentes', async () => {
    render(<ElectionsClientView />)

    expect(await screen.findByRole('link', { name: 'Votar em Presidente aberta' })).toHaveAttribute('href', '/votar/open')
    expect(screen.getByRole('link', { name: 'Ver resultado de Deputado SP' })).toHaveAttribute('href', '/eleicoes/closed/resultado')
    expect(screen.getByText('Resultado ainda não publicado')).toBeInTheDocument()
    expect(screen.queryByText('Deputado RJ')).not.toBeInTheDocument()
  })

  it('exibe o consolidado publicado em URL direta', async () => {
    render(<ElectionResultPage />)

    expect(await screen.findByRole('heading', { name: 'Deputado SP' })).toBeInTheDocument()
    expect(screen.getByText('Ana', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Agremiações')).toBeInTheDocument()
  })

  it('informa ausência de publicação em URL direta sem revelar votos', async () => {
    vi.mocked(getDoc).mockImplementation(async () => ({ exists: () => true, data: () => ({ ...elections[1].data(), publishedAllow: false }) }) as never)
    render(<ElectionResultPage />)

    await waitFor(() => expect(screen.getByText('Resultado ainda não publicado para esta eleição.')).toBeInTheDocument())
    expect(screen.queryByText('Ana', { exact: false })).not.toBeInTheDocument()
  })
})
