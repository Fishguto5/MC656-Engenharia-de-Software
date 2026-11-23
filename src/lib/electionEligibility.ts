import { LISTA_UFS, type ElectionType, type UF } from '@/lib/constants/election'

export function isUf(value: unknown): value is UF {
  return typeof value === 'string' && LISTA_UFS.some(uf => uf === value)
}

export function isElectionAvailableForUf(
  election: { type: ElectionType, uf?: UF, local?: 'Brasil' | UF },
  voterUf: UF,
): boolean {
  switch (election.type) {
    case 'president':
      return true
    case 'deputy':
      return election.uf === voterUf
    case 'public-consultation':
      return election.local === 'Brasil' || election.local === voterUf
  }
}
