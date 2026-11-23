import type { VoterSession } from '@/lib/voterSession'

export async function checkVoterParticipation(electionId: string, voter: VoterSession): Promise<boolean> {
  const response = await fetch(`/api/elections/${encodeURIComponent(electionId)}/participation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf: voter.cpf, uf: voter.uf }),
  })
  if (!response.ok) throw new Error('Não foi possível verificar a participação.')
  const result = await response.json() as { hasVoted?: unknown }
  if (typeof result.hasVoted !== 'boolean') throw new Error('Resposta inválida ao consultar participação.')
  return result.hasVoted
}
