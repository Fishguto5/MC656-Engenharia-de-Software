import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, getAuthorizedAdmin, normalizeCpf } from '@/lib/admin-session'
import { registerAdmin } from '@/lib/admin-registration'

export async function POST(request: NextRequest) {
  try {
    if (!await getAuthorizedAdmin(request.cookies.get(ADMIN_COOKIE)?.value)) {
      return NextResponse.json({ error: 'Acesso administrativo necessário.' }, { status: 401 })
    }

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

    const result = await registerAdmin(normalized)
    if (result === 'already-admin') {
      return NextResponse.json({ error: 'Este CPF já é administrador.' }, { status: 409 })
    }
    return NextResponse.json({ cpf: normalized, isAdmin: true, result }, {
      status: result === 'created' ? 201 : 200,
    })
  }
  catch (error) {
    console.error('Falha ao cadastrar administrador:', error)
    return NextResponse.json({ error: 'Não foi possível salvar no Firebase. Verifique as credenciais do servidor.' }, { status: 503 })
  }
}
