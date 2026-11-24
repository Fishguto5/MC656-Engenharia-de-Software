import { createHmac } from 'node:crypto'
import { doc } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import { isUf } from '@/lib/electionEligibility'
import { isValidCpf, onlyDigits } from '@/lib/utils/cpf'
import type { UF } from '@/lib/constants/election'

export function parseVoter(value: unknown): { cpf: string, uf: UF } | null {
  if (!value || typeof value !== 'object') return null
  const { cpf, uf } = value as Record<string, unknown>
  if (typeof cpf !== 'string' || !isValidCpf(cpf) || !isUf(uf)) return null
  return { cpf: onlyDigits(cpf), uf }
}

export function participationRef(electionId: string, cpf: string) {
  const secret = process.env.VOTER_PARTICIPATION_SECRET
  if (!secret || secret.length < 32) throw new Error('VOTER_PARTICIPATION_SECRET deve ter pelo menos 32 caracteres.')
  const id = createHmac('sha256', secret).update(cpf).digest('hex')
  return doc(firestore, 'eleicoes', electionId, 'participacoes', id)
}
