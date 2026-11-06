import { VotosCandidato } from '@/interfaces/eleicaoInterfaces'
import { MINIMUM_DEPUTY_AGE } from '@/lib/repository/firebaseElectionDeputyRepository'
import { MINIMUM_PRESIDENT_AGE } from '@/lib/repository/firebaseElectionPresidentRepository'

const hasMinimumAge = (dob: Date, minAge: number) => {
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age >= minAge
}

export const validateDraft = (
  electionType: 'president' | 'deputy' | 'public-consultation',
  data: {
    startsAt?: Date
    endsAt?: Date
    candidates?: VotosCandidato[]
  },
): string | null => {
  // 1. se ambas as datas estiverem preenchidas, valida o intervalo
  if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) {
    return 'A data de término deve ser posterior à data de início.'
  }

  // 2. se a lista existir e não estiver vazia
  if (data.candidates && data.candidates.length > 0 && electionType !== 'public-consultation') {
    const minAge = electionType === 'president' ? MINIMUM_PRESIDENT_AGE : MINIMUM_DEPUTY_AGE
    const cargo = electionType === 'president' ? 'Presidente' : 'Deputado'

    for (const candidato of data.candidates) {
      if (candidato.dataNascimento && !hasMinimumAge(candidato.dataNascimento, minAge)) {
        return `O candidato "${candidato.nome}" não possui a idade mínima necessária para ${cargo} (${minAge} anos).`
      }
    }
  }

  return null // Nenhuma regra violada
}
