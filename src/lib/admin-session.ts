import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'

export const ADMIN_COOKIE = 'admin_session'
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000

function secret(): string {
  const value = process.env.ADMIN_SESSION_SECRET
  if (!value || value.length < 32) {
    throw new Error('ADMIN_SESSION_SECRET deve ter pelo menos 32 caracteres.')
  }
  return value
}

export function normalizeCpf(value: string): string | null {
  const cpf = value.replace(/\D/g, '')
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return null

  for (let length = 9; length <= 10; length += 1) {
    let sum = 0
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index)
    }
    const digit = (sum * 10) % 11
    if ((digit === 10 ? 0 : digit) !== Number(cpf[length])) return null
  }
  return cpf
}

export async function isRegisteredAdmin(cpf: string): Promise<boolean> {
  const snap = await getDoc(doc(firestore, 'users', cpf))
  return snap.exists() && snap.data().isAdmin === true
}

export function createAdminSession(cpf: string): string {
  const payload = Buffer.from(JSON.stringify({ cpf, expiresAt: Date.now() + SESSION_DURATION_MS })).toString('base64url')
  const signature = createHmac('sha256', secret()).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function readAdminSession(cookie: string | undefined): string | null {
  if (!cookie) return null
  const [payload, signature, extra] = cookie.split('.')
  if (!payload || !signature || extra) return null

  const expected = createHmac('sha256', secret()).update(payload).digest()
  let received: Buffer
  try {
    received = Buffer.from(signature, 'base64url')
  }
  catch {
    return null
  }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { cpf?: unknown, expiresAt?: unknown }
    if (typeof data.cpf === 'string'
      && normalizeCpf(data.cpf) === data.cpf
      && typeof data.expiresAt === 'number'
      && data.expiresAt > Date.now()) {
      return data.cpf
    }
    return null
  }
  catch {
    return null
  }
}

export async function getAuthorizedAdmin(cookie: string | undefined): Promise<string | null> {
  const cpf = readAdminSession(cookie)
  return cpf && await isRegisteredAdmin(cpf) ? cpf : null
}
