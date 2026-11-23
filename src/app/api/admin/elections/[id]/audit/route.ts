import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, getAuthorizedAdmin } from '@/lib/admin-session'
import { recordElectionAction } from '@/lib/election-audit'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getAuthorizedAdmin(request.cookies.get(ADMIN_COOKIE)?.value)
    if (!actor) return NextResponse.json({ error: 'Acesso administrativo necessário.' }, { status: 401 })

    const { id } = await params
    if (!id || id.includes('/')) return NextResponse.json({ error: 'Eleição inválida.' }, { status: 400 })
    const body = await request.json() as { action?: unknown }
    if (body.action !== 'created' && body.action !== 'edited') {
      return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
    }
    await recordElectionAction(id, body.action, actor)
    return NextResponse.json({ ok: true }, { status: 201 })
  }
  catch (error) {
    console.error('Falha ao registrar ação administrativa:', error)
    return NextResponse.json({ error: 'Não foi possível registrar a ação administrativa.' }, { status: 503 })
  }
}
