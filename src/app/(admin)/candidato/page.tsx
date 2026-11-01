// (Server Component)
import { firebaseCandidateRepository } from '@/lib/repository/firebaseCandidatesRepository'
import CandidatoClientView from './CandidatoClientView'

export default async function Page() {
  // Busca os dados diretamente no servidor (pode ser cacheado nativamente)
  const candidatos = await firebaseCandidateRepository.findAllActive()

  return <CandidatoClientView initialCandidatos={candidatos} />
}
