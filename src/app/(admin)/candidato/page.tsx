// (Server Component)
import { firebaseCandidate } from '@/lib/repository/firebaseCandidatesRepository'
import CandidatoClientView from './CandidatoClientView'

export default async function Page() {
  // Busca os dados diretamente no servidor (pode ser cacheado nativamente)
  const candidatos = await firebaseCandidate.findAllActive()

  return <CandidatoClientView initialCandidatos={candidatos} />
}
