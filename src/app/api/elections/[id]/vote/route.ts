import { NextRequest, NextResponse } from 'next/server'
import { collection, doc, getDocs, increment, limit, query, runTransaction, where } from 'firebase/firestore'
import { isVotingOpen } from '@/lib/election-timing'
import { firestore } from '@/lib/firebase'
import { isElectionAvailableForUf, isUf } from '@/lib/electionEligibility'
import { parseVoter, participationRef } from '@/lib/voterParticipation'

type VoteInput
  = | { type: 'public-consultation', proposalApproved: boolean }
    | { type: 'president' | 'deputy', candidateNumber: number }

function parseVote(value: unknown): VoteInput | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  if (data.type === 'public-consultation' && typeof data.proposalApproved === 'boolean') {
    return { type: data.type, proposalApproved: data.proposalApproved }
  }
  if ((data.type === 'president' || data.type === 'deputy')
    && Number.isSafeInteger(data.candidateNumber)
    && (data.candidateNumber as number) >= 0) {
    return { type: data.type, candidateNumber: data.candidateNumber as number }
  }
  return null
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let vote: VoteInput | null = null
  let voter: ReturnType<typeof parseVoter> = null
  try {
    const body = await request.json()
    vote = parseVote(body)
    voter = parseVoter(body)
  }
  catch {
    return NextResponse.json({ error: 'Voto inválido.' }, { status: 400 })
  }
  if (!id || id.includes('/') || !vote || !voter) return NextResponse.json({ error: 'Voto ou identificação inválidos.' }, { status: 400 })

  try {
    const electionRef = doc(firestore, 'eleicoes', id)
    const participation = participationRef(id, voter.cpf)
    const candidateRef = vote.type !== 'public-consultation' && vote.candidateNumber !== 0
      ? (await getDocs(query(
          collection(firestore, 'eleicoes', id, 'candidatos'),
          where('numero', '==', vote.candidateNumber),
          limit(1),
        ))).docs[0]?.ref
      : undefined

    await runTransaction(firestore, async (transaction) => {
      const election = await transaction.get(electionRef)
      if (!election.exists()) throw new Error('NOT_FOUND')
      const data = election.data()
      if (data.type !== vote.type) throw new Error('INVALID_TYPE')
      const location = {
        type: vote.type,
        uf: isUf(data.uf) ? data.uf : undefined,
        local: data.local === 'Brasil' || isUf(data.local) ? data.local : undefined,
      }
      if (!isElectionAvailableForUf(location, voter.uf)) throw new Error('WRONG_UF')
      if (!isVotingOpen(data.status, data.startsAt, data.endsAt, new Date())) throw new Error('CLOSED')
      const existingParticipation = await transaction.get(participation)
      if (existingParticipation.exists()) throw new Error('ALREADY_VOTED')

      let target = electionRef
      let update: Record<string, unknown>

      if (vote.type === 'public-consultation') {
        update = { [vote.proposalApproved ? 'sim' : 'nao']: increment(1) }
      }
      else if (vote.candidateNumber === 0) {
        update = { votosBrancos: increment(1) }
      }
      else if (candidateRef) {
        const candidate = await transaction.get(candidateRef)
        if (candidate.exists() && candidate.data().numero === vote.candidateNumber) {
          target = candidateRef
          update = { votos: increment(1) }
        }
        else update = { votosNulos: increment(1) }
      }
      else update = { votosNulos: increment(1) }

      transaction.update(target, update)
      transaction.set(participation, { votedAt: new Date() })
    })
    return NextResponse.json({ ok: true })
  }
  catch (error) {
    if (error instanceof Error && error.message === 'CLOSED') {
      return NextResponse.json({ error: 'A votação não está aberta.' }, { status: 409 })
    }
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Eleição não encontrada.' }, { status: 404 })
    }
    if (error instanceof Error && error.message === 'INVALID_TYPE') {
      return NextResponse.json({ error: 'Tipo de voto inválido.' }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'WRONG_UF') {
      return NextResponse.json({ error: 'Esta votação não está disponível para a UF informada.' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'ALREADY_VOTED') {
      return NextResponse.json({ error: 'Voto já computado para este CPF.', code: 'ALREADY_VOTED' }, { status: 409 })
    }
    console.error('Erro ao registrar voto:', error)
    return NextResponse.json({ error: 'Não foi possível registrar o voto.' }, { status: 503 })
  }
}
