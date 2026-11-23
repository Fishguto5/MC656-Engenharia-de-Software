import { NextRequest, NextResponse } from 'next/server'
import { getDoc } from 'firebase/firestore'
import { parseVoter, participationRef } from '@/lib/voterParticipation'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let voter: ReturnType<typeof parseVoter>
  try {
    voter = parseVoter(await request.json())
  }
  catch {
    return NextResponse.json({ error: 'Identificação inválida.' }, { status: 400 })
  }
  if (!id || id.includes('/') || !voter) return NextResponse.json({ error: 'Identificação inválida.' }, { status: 400 })

  try {
    const snapshot = await getDoc(participationRef(id, voter.cpf))
    return NextResponse.json({ hasVoted: snapshot.exists() })
  }
  catch (error) {
    console.error('Erro ao consultar participação:', error)
    return NextResponse.json({ error: 'Não foi possível verificar a participação.' }, { status: 503 })
  }
}
