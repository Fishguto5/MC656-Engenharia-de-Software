import { NextRequest, NextResponse } from 'next/server'
import { collection, doc, getDocs, increment, limit, query, runTransaction, where } from 'firebase/firestore'
import { isVotingOpen } from '@/lib/election-timing'
import { firestore } from '@/lib/firebase'

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
  try {
    vote = parseVote(await request.json())
  }
  catch {
    return NextResponse.json({ error: 'Voto inválido.' }, { status: 400 })
  }
  if (!id || !vote) return NextResponse.json({ error: 'Voto inválido.' }, { status: 400 })

  try {
    const electionRef = doc(firestore, 'eleicoes', id)
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
      if (!isVotingOpen(data.status, data.startsAt, data.endsAt, new Date())) throw new Error('CLOSED')

      if (vote.type === 'public-consultation') {
        transaction.update(electionRef, { [vote.proposalApproved ? 'sim' : 'nao']: increment(1) })
        return
      }

      if (vote.candidateNumber === 0) {
        transaction.update(electionRef, { votosBrancos: increment(1) })
        return
      }

      if (candidateRef) {
        const candidate = await transaction.get(candidateRef)
        if (candidate.exists() && candidate.data().numero === vote.candidateNumber) {
          transaction.update(candidateRef, { votos: increment(1) })
          return
        }
      }
      transaction.update(electionRef, { votosNulos: increment(1) })
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
    console.error('Erro ao registrar voto:', error)
    return NextResponse.json({ error: 'Não foi possível registrar o voto.' }, { status: 503 })
  }
}
