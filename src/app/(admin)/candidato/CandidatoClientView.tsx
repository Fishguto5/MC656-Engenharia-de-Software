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
          const candidatosProcessados: Candidato[] = results.data.map((row) => {
            const dataString = row.dataNascimento ? row.dataNascimento.trim() : ''
            const dataNascimentoDate = dataString ? new Date(dataString) : new Date()

            return {
              id: '',
              nome: row.nome ?? '',
              partido: row.partido ?? '',
              dataNascimento: dataNascimentoDate,
              federacao: row.federacao ? row.federacao.trim() : null,
            } as Candidato
          })

          console.log('Dados tratados:', candidatosProcessados)

          // Salva no Firebase e recebe os candidatos já com os IDs reais gerados
          const novosCandidatos = await firebaseCandidateRepository.createBatch(candidatosProcessados)

          // Atualiza o estado local imediatamente unindo os antigos com os novos
          setCandidatos(prev => [...prev, ...novosCandidatos].sort((a, b) => a.partido.localeCompare(b.partido)))

          // Limpa o input de arquivo
          if (hiddenFileInput.current) {
            hiddenFileInput.current.value = ''
          }

          // Refresh
          router.refresh()
          console.log('Importação concluída com sucesso!')
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
