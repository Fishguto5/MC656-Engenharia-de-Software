import { VotosCandidato } from '../deputado'

export function numberIsUnique(list: readonly VotosCandidato[]): boolean {
  const visto = new Set<number>()

  for (const cand of list) {
    if (visto.has(cand.numero)) {
      return false
    }
    visto.add(cand.numero)
  }

  return true
}
