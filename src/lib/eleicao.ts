import {
  ConsultaPublica,
  EleicaoPresidente,
  VotosCandidato,
} from '@/interfaces/eleicaoInterfaces'

export type ResultadoPrimeiroTurno = [VotosCandidato, VotosCandidato] | VotosCandidato

export function ordenarCandidatosPorVotos(eleicao: EleicaoPresidente): VotosCandidato[] {
  return [...eleicao.candidatos].sort((a, b) => b.votos - a.votos)
}

export function precisaSegundoTurno(eleicao: EleicaoPresidente): boolean {
  const votosValidos = eleicao.candidatos.reduce((acc, c) => acc + c.votos, 0)
  if (votosValidos === 0) return false

  const maisVotado = ordenarCandidatosPorVotos(eleicao)[0]
  return maisVotado.votos / votosValidos <= 0.5
}

export function getCandidatosSegundoTurno(
  eleicao: EleicaoPresidente,
): [VotosCandidato, VotosCandidato] | null {
  if (!precisaSegundoTurno(eleicao)) return null

  const ordenados = ordenarCandidatosPorVotos(eleicao)
  return [ordenados[0], ordenados[1]]
}

export function resultadoConsultaPublica(c: ConsultaPublica): boolean {
  return c.sim >= c.nao
}

export function getResultadoPrimeiroTurno(eleicao: EleicaoPresidente): ResultadoPrimeiroTurno {
  const sturno = getCandidatosSegundoTurno(eleicao)
  if (sturno !== null) return sturno

  return ordenarCandidatosPorVotos(eleicao)[0]
}
