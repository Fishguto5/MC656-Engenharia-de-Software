import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, createAdminSession, isRegisteredAdmin, normalizeCpf } from '@/lib/admin-session'

export async function POST(request: NextRequest) {
  let cpf: unknown
  try {
    cpf = (await request.json()).cpf
  }
  catch {
    return NextResponse.json({ error: 'Informe um CPF válido.' }, { status: 400 })
  }

  const normalized = typeof cpf === 'string' ? normalizeCpf(cpf) : null
  if (!normalized) {
    return NextResponse.json({ error: 'Informe um CPF válido.' }, { status: 400 })
  }

  try {
    if (!await isRegisteredAdmin(normalized)) {
      return NextResponse.json({ error: 'CPF sem permissão administrativa.' }, { status: 403 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(ADMIN_COOKIE, createAdminSession(normalized), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60,
    })
    return response
  }
  catch (error) {
    console.error('Falha ao autenticar administrador:', error)
    return NextResponse.json({ error: 'Não foi possível autenticar. Tente novamente.' }, { status: 503 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete(ADMIN_COOKIE)
  return response
}
