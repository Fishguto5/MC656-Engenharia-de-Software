import { VotosCandidato } from "@/interfaces/eleicaoInterfaces"

type Estado = string
type Local = 'Brasil' | Estado

export type VotacaoPresidente = {
  id: string
  data: Date
  candidatos: VotosCandidato[]
  votosBrancos: number
  votosNulos: number
}

export type ResultadoPrimeiroTurno = [VotosCandidato, VotosCandidato] | VotosCandidato

export function ordenarCandidatosPorVotos(votacao: VotacaoPresidente): VotosCandidato[] {
  return [...votacao.candidatos].sort((a, b) => b.votos - a.votos)
}

export function precisaSegundoTurno(votacao: VotacaoPresidente): boolean {
  const votosValidos = votacao.candidatos.reduce((acc, c) => acc + c.votos, 0)
  if (votosValidos == 0) return false

  const maisVotado = ordenarCandidatosPorVotos(votacao)[0]
  return (maisVotado.votos / votosValidos) <= 0.5
}

export function getCandidatosSegundoTurno(votacao: VotacaoPresidente): [VotosCandidato, VotosCandidato] | null {
  if (!precisaSegundoTurno(votacao)) return null

  const ordenados = ordenarCandidatosPorVotos(votacao)
  return [ordenados[0], ordenados[1]]
}

export type ConsultaPublica = {
  id: string
  local: Local
  data: Date
  sim: number
  nao: number
}

export function resultadoConsultaPublica(c: ConsultaPublica): boolean {
  return c.sim >= c.nao
}

export function getResultadoPrimeiroTurno(votacao: VotacaoPresidente): ResultadoPrimeiroTurno {
  const sturno = getCandidatosSegundoTurno(votacao)
  if (sturno !== null) return sturno

  return ordenarCandidatosPorVotos(votacao)[0]
}
