'use client'

import CandidatoCard from '@/components/CandidatoCard/page';
import './candidato.css'
import { Candidato } from '@/interfaces/eleicaoInterfaces';
import { useState } from 'react'
import Link from 'next/link';

export default function CadastrarCandidato() {
  // ===========MOCKUP===================================
  const [candidatos, setCandidatos] = useState<Candidato[]>([
    {
      id: 'cand-01',
      nome: 'Ana Silva',
      partido: 'PARTIDO A',
      dataNascimento: new Date('1975-04-12'),
      federacao: 'Federação Esperança Brasil',
    },
    {
      id: 'cand-02',
      nome: 'Carlos Souza',
      partido: 'PARTIDO B',
      dataNascimento: new Date('1968-11-23'),
    },
    {
      id: 'cand-03',
      nome: 'Mariana Oliveira',
      partido: 'PARTIDO A',
      dataNascimento: new Date('1982-06-15'),
      federacao: 'Federação Esperança Brasil',
    },
    {
      id: 'cand-04',
      nome: 'João Pereira',
      partido: 'PARTIDO C',
      dataNascimento: new Date('1990-01-30'),
    },
    {
      id: 'cand-05',
      nome: 'Beatriz Lima',
      partido: 'PARTIDO B',
      dataNascimento: new Date('1985-09-05'),
    },
  ]);
  // ====================================================


  return (
    <main className="signup-candidate-page">
      <header>
        <Link href="/admin/candidato/cadastrar" className="adicionar-candidato">Novo Candidato</Link>
      </header>
      <section className='candidate-list'>
        <h1>Lista de Candidatos</h1>
        {candidatos.map((cand)=>{
          return <CandidatoCard 
                      key={cand.id} 
                      id={cand.id} 
                      nome={cand.nome} 
                      partido={cand.partido} 
                      federacao={cand.federacao}
                      deleteFunction={()=>{
                        setCandidatos(
                          candidatos.filter((c)=>
                            c.id !== cand.id
                          )
                        )
                      }}
                  />
        })}
      </section>

    </main>
  )
}
