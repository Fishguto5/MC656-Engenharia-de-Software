'use client'

import { ConsultaPublicaVotarForm } from '@/components/VotarForm/ConsultaPublicaVotar'
import { DeputadoVotarForm } from '@/components/VotarForm/DeputadoVotar'
import { PresidenteVotarForm } from '@/components/VotarForm/PresidenteVotar'
import { ConsultaPublica, EleicaoDeputado, EleicaoPresidente } from '@/interfaces/eleicaoInterfaces'
import { isElectionAvailableForUf } from '@/lib/electionEligibility'
import { firebaseElection, VotePayload } from '@/lib/repository/firebaseElectionFacade'
import { readVoterSession, type VoterSession } from '@/lib/voterSession'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { isVotingOpen } from '@/lib/election-timing'

type ElectionData = EleicaoDeputado | EleicaoPresidente | ConsultaPublica

export default function VotacaoPage() {
  const params = useParams()
  const id = params.id as string
  const [electionData, setElectionData] = useState<ElectionData | null>(null)
  const [voter, setVoter] = useState<VoterSession | null>(null)
  const [message, setMessage] = useState('Votação não encontrada.')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function getEleicao() {
      const voterSession = readVoterSession()
      if (!voterSession) {
        if (isMounted) {
          setMessage('Informe seu CPF, nome e UF do domicílio eleitoral para acessar esta votação.')
          setLoading(false)
        }
        return
      }
      if (!id) {
        if (isMounted) setLoading(false)
        return
      }

      try {
        const tipoEleicao = await firebaseElection.getType(id)
        if (!tipoEleicao) {
          if (isMounted) setMessage('Votação não encontrada ou com tipo inválido.')
          return
        }

        const eleicao = await firebaseElection.findById(id, tipoEleicao)
        if (!isMounted) return
        if (!eleicao) {
          setMessage('Os dados desta votação estão indisponíveis. Tente novamente mais tarde.')
          return
        }

        setVoter(voterSession)
        if (!isElectionAvailableForUf(eleicao, voterSession.uf)) {
          setMessage('Esta votação não está disponível para a UF do seu domicílio eleitoral.')
        }
        else if (!isVotingOpen(eleicao.status, eleicao.startsAt, eleicao.endsAt)) {
          setMessage('Esta votação não está aberta no momento.')
        }
        else {
          setElectionData(eleicao)
        }
      }
      catch (error) {
        console.error(error)
        if (isMounted) setMessage('Não foi possível carregar esta votação. Tente novamente.')
      }
      finally {
        if (isMounted) setLoading(false)
      }
    }

    getEleicao()

    return () => {
      isMounted = false
    }
  }, [id])

  const handleVoteSubmit = async (payload: VotePayload) => {
    if (!electionData || !voter) return
    const currentVoter = readVoterSession()
    if (!currentVoter || currentVoter.cpf !== voter.cpf || currentVoter.uf !== voter.uf) {
      setElectionData(null)
      setMessage('Sua identificação mudou. Identifique-se novamente para votar.')
      return
    }

    try {
      const currentElection = await firebaseElection.findById(electionData.id, electionData.type)
      if (!currentElection || !isElectionAvailableForUf(currentElection, currentVoter.uf)
        || !isVotingOpen(currentElection.status, currentElection.startsAt, currentElection.endsAt)) {
        setElectionData(null)
        setMessage('Esta votação não está disponível para sua UF ou não está aberta no momento.')
        return
      }
      await firebaseElection.registerVote(electionData.id, payload)
      alert('Voto registrado com sucesso!')
    }
    catch (error) {
      console.error('Erro ao registrar voto:', error)
      alert('Não foi possível registrar o voto. Verifique se a votação ainda está aberta.')
    }
  }

  if (loading) return <p>Carregando votação...</p>
  if (!electionData) return (
    <main className="signup-candidate-page">
      <p role="alert">{message}</p>
      <Link href={voter ? '/eleicoes' : '/sign-up'}>{voter ? 'Voltar para eleições' : 'Ir para identificação'}</Link>
    </main>
  )

  return (
    <main className="signup-candidate-page">
      {message !== 'Votação não encontrada.' && <p role="alert">{message}</p>}
      {electionData.type === 'public-consultation' && (
        <ConsultaPublicaVotarForm election={electionData} onSubmit={handleVoteSubmit} />
      )}

      {electionData.type === 'president' && (
        <PresidenteVotarForm election={electionData} onSubmit={handleVoteSubmit} />
      )}

      {electionData.type === 'deputy' && (
        <DeputadoVotarForm election={electionData} onSubmit={handleVoteSubmit} />
      )}
    </main>
  )
}
