export type Candidato = {
  id: string
  nome: string
  partido: string
  votos: number
}

export type VotacaoPresidente = {
  id: string
  data: Date
  candidatos: Candidato[]
  votosBrancos: number
  votosNulos: number
  totalVotos: number
}

export function precisaSegundoTurno(votacao: VotacaoPresidente): boolean {
  const votosValidos = votacao.candidatos.reduce((acc, c) => acc + c.votos, 0)
  if (votosValidos == 0) return false

  const maisVotado = [...votacao.candidatos].sort((a, b) => b.votos - a.votos)[0]
  return (maisVotado.votos / votosValidos) <= 0.5
}

export function getCandidatosSegundoTurno(votacao: VotacaoPresidente): [Candidato, Candidato] | null {
  if (!precisaSegundoTurno(votacao)) return null

  const ordenados = [...votacao.candidatos].sort((a, b) => b.votos - a.votos)
  return [ordenados[0], ordenados[1]]
}
