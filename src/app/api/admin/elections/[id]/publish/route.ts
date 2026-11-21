import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, getAuthorizedAdmin } from '@/lib/admin-session'
import { publishElectionResult, ResultPublicationError } from '@/lib/election-results'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getAuthorizedAdmin(request.cookies.get(ADMIN_COOKIE)?.value)
    if (!actor) {
      return NextResponse.json({ error: 'Acesso administrativo necessário.' }, { status: 401 })
    }
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Eleição inválida.' }, { status: 400 })
    const result = await publishElectionResult(id, actor)
    return NextResponse.json({ result }, { status: 201 })
  }
  catch (error) {
    if (error instanceof ResultPublicationError) {
      const status = error.code === 'NOT_FOUND' ? 404 : error.code === 'INVALID_DATA' ? 422 : 409
      return NextResponse.json({ error: error.message }, { status })
    }
    console.error('Falha ao publicar resultado:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied') {
      return NextResponse.json({ error: 'O Firestore negou a publicação. Atualize as regras de acesso do banco.' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Não foi possível publicar o resultado.' }, { status: 503 })
  }
}
