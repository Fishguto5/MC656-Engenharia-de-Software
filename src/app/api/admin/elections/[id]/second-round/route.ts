import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, getAuthorizedAdmin } from '@/lib/admin-session'
import { createSecondRound, SecondRoundError } from '@/lib/second-round'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getAuthorizedAdmin(request.cookies.get(ADMIN_COOKIE)?.value)
    if (!actor) return NextResponse.json({ error: 'Acesso administrativo necessário.' }, { status: 401 })
    const { id } = await params
    if (!id || id.includes('/')) return NextResponse.json({ error: 'Eleição inválida.' }, { status: 400 })
    const payload = await request.json() as unknown
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    }
    const input = payload as { startsAt?: unknown, endsAt?: unknown, candidateIds?: unknown }
    const secondRoundId = await createSecondRound(id, input, actor)
    return NextResponse.json({ id: secondRoundId }, { status: 201 })
  }
  catch (error) {
    if (error instanceof SecondRoundError) {
      const status = error.code === 'NOT_FOUND'
        ? 404
        : error.code === 'INVALID_PERIOD' || error.code === 'INVALID_CANDIDATES' ? 400 : 409
      return NextResponse.json({ error: error.message }, { status })
    }
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    console.error('Falha ao criar segundo turno:', error)
    return NextResponse.json({ error: 'Não foi possível criar o segundo turno.' }, { status: 503 })
  }
}
