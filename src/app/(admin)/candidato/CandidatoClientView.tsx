'use client'

import CandidatoCard from '@/components/CandidatoCard/CandidatoCard'
import './candidato.css'
import { Candidato } from '@/interfaces/eleicaoInterfaces'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { firebaseCandidateRepository } from '@/lib/repository/firebaseCandidatesRepository'
import Papa from 'papaparse'
import { useRouter } from 'next/navigation'

export interface CandidatoCSV {
  nome: string
  partido: string
  dataNascimento: string
  federacao?: string
}

export default function CandidatoClientView({ initialCandidatos }: { initialCandidatos: Candidato[] }) {
  const router = useRouter()

  const [candidatos, setCandidatos] = useState<Candidato[]>(initialCandidatos)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const hiddenFileInput = useRef<HTMLInputElement>(null)

  async function handleDelete(id: string) {
    const candidatosAnteriores = candidatos
    setCandidatos(prev => prev.filter(c => c.id !== id))

    try {
      await firebaseCandidateRepository.deactivate(id)
    }
    catch (error) {
      console.error('Erro ao desativar candidato:', error)
      setCandidatos(candidatosAnteriores)
      alert('Não foi possível desativar o candidato. Tente novamente.')
    }
  }

  async function handleCsvInput(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    setIsUploading(true)

    Papa.parse<CandidatoCSV>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          // Processa e filtra os candidatos inválidos em uma única etapa
          const candidatosProcessados: Candidato[] = results.data
            .map((row) => {
              const nome = row.nome ? row.nome.trim() : ''
              const partido = row.partido ? row.partido.trim() : ''
              const dataString = row.dataNascimento ? row.dataNascimento.trim() : ''

              // 1. Verifica se falta nome, partido ou data
              if (!nome || !partido || !dataString) {
                return null
              }

              // 2. Converte e valida a data
              const dataNascimentoDate = new Date(`${dataString}T00:00:00`)

              // 3. Verifica se a data gerada é inválida
              if (isNaN(dataNascimentoDate.getTime())) {
                // console.warn(`Data inválida encontrada para o candidato: ${nome}. Data informada: "${dataString}"`)
                return null
              }

              return {
                id: '',
                nome,
                partido,
                dataNascimento: dataNascimentoDate,
                federacao: row.federacao ? row.federacao.trim() : undefined,
              } as Candidato
            })
            .filter((candidato): candidato is Candidato => candidato !== null) // Remove todos os nulos (inválidos/faltantes)

          if (candidatosProcessados.length === 0) {
            alert('Nenhum candidato válido foi encontrado no arquivo CSV.')
            return
          }

          // Salva no Firebase e recebe os candidatos já com os IDs reais gerados
          const novosCandidatos = await firebaseCandidateRepository.createBatch(candidatosProcessados)

          // Atualiza o estado local
          setCandidatos(prev => [...prev, ...novosCandidatos].sort((a, b) => a.partido.localeCompare(b.partido)))

          // Limpa o input de arquivo
          if (hiddenFileInput.current) {
            hiddenFileInput.current.value = ''
          }

          // Refresh
          router.refresh()
        }
        catch (error) {
          console.error('Erro no upload:', error)
          alert('Não foi possível importar o arquivo')
        }
        finally {
          setIsUploading(false)
        }
      },
      error: (error) => {
        console.error('Erro ao ler o CSV:', error.message)
        alert('Erro ao ler o arquivo CSV')
        setIsUploading(false)
      },
    })
  }

  return (
    <main className="signup-candidate-page">
      <header>
        <Link href="/candidato/cadastrar" className="adicionar-candidato">Novo Candidato</Link>

        <div className="w-full">
          <label
            htmlFor="csvFileInput"
            className={`adicionar-candidato ${isUploading ? 'disabled-label' : ''}`}
            title="nome|partido|dataNascimento|federacao (opicional)"
          >
            Importar Candidato
          </label>
          <input
            type="file"
            accept=".csv"
            id="csvFileInput"
            hidden
            ref={hiddenFileInput}
            onChange={handleCsvInput}
            disabled={isUploading}
          />
        </div>
      </header>
      <section className="candidate-list">
        <h1>Lista de Candidatos</h1>
        {candidatos.map((cand) => {
          return (
            <CandidatoCard
              key={cand.id}
              id={cand.id}
              nome={cand.nome}
              partido={cand.partido}
              federacao={cand.federacao}
              deleteFunction={() => { handleDelete(cand.id) }}
            />
          )
        })}
      </section>

    </main>
  )
}
