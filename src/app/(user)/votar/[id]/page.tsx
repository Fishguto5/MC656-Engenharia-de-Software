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
import { useState, useEffect, useRef } from 'react'
import { isVotingOpen } from '@/lib/election-timing'
import { checkVoterParticipation } from '@/lib/checkVoterParticipation'
import { useRouter } from 'next/navigation'

type ElectionData = EleicaoDeputado | EleicaoPresidente | ConsultaPublica

export default function VotacaoPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const [electionData, setElectionData] = useState<ElectionData | null>(null)
  const [voter, setVoter] = useState<VoterSession | null>(null)
  const [message, setMessage] = useState('Votação não encontrada.')
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [voteError, setVoteError] = useState('')
  const pendingVote = useRef(false)

  useEffect(() => {
    if (!completed) return
    const timer = setTimeout(() => router.replace('/eleicoes'), 5000)
    return () => clearTimeout(timer)
  }, [completed, router])

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
        else if (await checkVoterParticipation(id, voterSession)) {
          if (isMounted) setMessage('Voto computado. Você já participou desta votação.')
        }
        else {
          if (isMounted) setElectionData(eleicao)
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
    if (!electionData || !voter || pendingVote.current) return
    const currentVoter = readVoterSession()
    if (!currentVoter || currentVoter.cpf !== voter.cpf || currentVoter.uf !== voter.uf) {
      setElectionData(null)
      setMessage('Sua identificação mudou. Identifique-se novamente para votar.')
      return
    }

    try {
      pendingVote.current = true
      setSubmitting(true)
      setVoteError('')
      const currentElection = await firebaseElection.findById(electionData.id, electionData.type)
      if (!currentElection || !isElectionAvailableForUf(currentElection, currentVoter.uf)
        || !isVotingOpen(currentElection.status, currentElection.startsAt, currentElection.endsAt)) {
        setElectionData(null)
        setMessage('Esta votação não está disponível para sua UF ou não está aberta no momento.')
        return
      }
      await firebaseElection.registerVote(electionData.id, payload, currentVoter)
      setCompleted(true)
    }
    catch (error) {
      console.error('Erro ao registrar voto:', error)
      if (error instanceof Error && error.message.includes('Voto já computado')) {
        setElectionData(null)
        setMessage('Voto computado. Você já participou desta votação.')
      }
      else setVoteError(error instanceof Error ? error.message : 'Não foi possível registrar o voto.')
    }
    finally {
      pendingVote.current = false
      setSubmitting(false)
    }
  }

  if (loading) return <p>Carregando votação...</p>
  if (completed) return (
    <main className="signup-candidate-page">
      <section className="signup-card" role="status">
        <h1>Voto computado</h1>
        <p>Seu voto foi registrado. Você voltará para as eleições disponíveis em cinco segundos.</p>
        <Link href="/eleicoes">Voltar para eleições agora</Link>
      </section>
    </main>
  )
  if (!electionData) return (
    <main className="signup-candidate-page">
      <p role="alert">{message}</p>
      <Link href={voter ? '/eleicoes' : '/sign-up'}>{voter ? 'Voltar para eleições' : 'Ir para identificação'}</Link>
    </main>
  )

  return (
    <main className="signup-candidate-page">
      {message !== 'Votação não encontrada.' && <p role="alert">{message}</p>}
      {voteError && <p role="alert">{voteError}</p>}
      {submitting && <p role="status">Registrando voto...</p>}
      {electionData.type === 'public-consultation' && (
        <>
          <ConsultaPublicaVotarForm election={electionData} onSubmit={handleVoteSubmit} />
          {electionData.partialResultsAllowed === true && (
            <p><Link href={`/eleicoes/${encodeURIComponent(id)}/parcial`}>Acompanhar resultado parcial</Link></p>
          )}
        </>
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
