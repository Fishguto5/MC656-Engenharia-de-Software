// Soma dos votos nominais. Votos em branco e nulos não são computados

import {
  EleicaoDeputado,
  ResultadoAgremiacao,
  ResultadoDeputado,
  VotosCandidato,
  VotosLegenda,
} from '@/interfaces/eleicaoInterfaces'
import {
  VOTACAO_MINIMA_AGREMIACAO_SOBRAS,
  VOTACAO_MINIMA_CANDIDATO,
  VOTACAO_MINIMA_CANDIDATO_SOBRAS,
} from './constants/election'

export type { EleicaoDeputado, ResultadoAgremiacao, ResultadoDeputado, VotosCandidato, VotosLegenda }

// (CF, art. 77, § 2º; Lei 9.504/97, art. 2º).
export function somarVotos(candidatos: VotosCandidato[]): number {
  return candidatos.reduce((acc, c) => acc + c.votos, 0)
}

// Lança RangeError se algum valor não for um inteiro maior ou igual a zero.
export function validarVotos(valores: number[]): void {
  for (const valor of valores) {
    if (!Number.isInteger(valor) || valor < 0) {
      throw new RangeError(`Quantidade de votos inválida: ${valor}`)
    }
  }
}

// Maior votação primeiro. Em caso de empate, prevalece o VotosCandidato mais idoso
// (CF, art. 77, § 5º; Lei 9.504/97, art. 2º, § 3º; Código Eleitoral, art. 110).
// Sem data de nascimento informada, a ordem original é mantida (sort estável).
export function compararPorVotacao(a: VotosCandidato, b: VotosCandidato): number {
  if (a.votos !== b.votos) return b.votos - a.votos

  if (a.dataNascimento && b.dataNascimento) {
    return a.dataNascimento.getTime() - b.dataNascimento.getTime()
  }

  return 0
}

export function ordenarPorVotacao(candidatos: VotosCandidato[]): VotosCandidato[] {
  return [...candidatos].sort(compararPorVotacao)
}

// Nome da agremiação (partido ou federação) pela qual o VotosCandidato concorre.
export function agremiacaoDe(VotosCandidato: VotosCandidato): string {
  return VotosCandidato.federacao ?? VotosCandidato.partido
}

// Rejeita agremiações desconhecidas, duplicadas e quantidades inválidas.
export function criarVotosLegenda(
  agremiacoes: readonly string[],
  entradas: readonly (readonly [string, number])[],
): VotosLegenda {
  const validas = new Set(agremiacoes)
  const votos: Record<string, number> = {}

  for (const [nome, quantidade] of entradas) {
    if (!validas.has(nome)) {
      throw new RangeError(`Agremiação desconhecida: ${nome}`)
    }
    if (Object.prototype.hasOwnProperty.call(votos, nome)) {
      throw new RangeError(`Votos de legenda duplicados: ${nome}`)
    }
    validarVotos([quantidade])
    votos[nome] = quantidade
  }

  return votos
}

type Agremiacao = {
  nome: string
  votosNominais: number
  votosLegenda: number
  votosValidos: number
  quocientePartidario: number
  // Cadeiras já obtidas (quociente + sobras), preenchidas ou não. É o
  // denominador (+1) da média (Res.-TSE 23.677/2021, art. 11, § 5º).
  vagasObtidas: number
  vagasSobras: number
  candidatos: VotosCandidato[]
  eleitos: VotosCandidato[]
}

// Art. 106: quociente eleitoral = votos válidos / vagas. A fração igual ou
// inferior a meio é desprezada; superior a meio equivale a um.
export function calcularQuocienteEleitoral(votosValidos: number, vagas: number): number {
  if (!Number.isInteger(vagas) || vagas <= 0) {
    throw new RangeError('O número de vagas deve ser um inteiro positivo.')
  }

  const inteiro = Math.floor(votosValidos / vagas)
  const resto = votosValidos % vagas

  return resto * 2 > vagas ? inteiro + 1 : inteiro
}

// Art. 107: quociente partidário = votos válidos da agremiação (nominais mais
// legenda) / quociente eleitoral, desprezada a fração.
export function calcularQuocientePartidario(votosValidosAgremiacao: number, quocienteEleitoral: number): number {
  if (quocienteEleitoral <= 0) return 0
  return Math.floor(votosValidosAgremiacao / quocienteEleitoral)
}

// votos >= percentual% do QE, só com inteiros (sem erro de ponto flutuante).
function atingePercentual(votos: number, percentual: number, quocienteEleitoral: number): boolean {
  return votos * 100 >= quocienteEleitoral * percentual
}

function validarEleicaoDeputado(eleicao: EleicaoDeputado, vagas: number): void {
  if (!Number.isInteger(vagas) || vagas <= 0) {
    throw new RangeError('O número de vagas deve ser um inteiro positivo.')
  }

  const validas = new Set(eleicao.agremiacoes)

  for (const VotosCandidato of eleicao.candidatos) {
    if (!validas.has(agremiacaoDe(VotosCandidato))) {
      throw new RangeError(`VotosCandidato ${VotosCandidato.id} de agremiação desconhecida: ${agremiacaoDe(VotosCandidato)}`)
    }
  }

  const votosLegendaRecord = eleicao.votosLegenda instanceof Map
    ? Object.fromEntries(eleicao.votosLegenda)
    : eleicao.votosLegenda

  for (const nome of Object.keys(votosLegendaRecord)) {
    if (!validas.has(nome)) {
      throw new RangeError(`Agremiação desconhecida: ${nome}`)
    }
  }

  validarVotos([
    ...eleicao.candidatos.map(c => c.votos),
    ...(Object.values(votosLegendaRecord) as number[]),
    eleicao.votosBrancos,
    eleicao.votosNulos,
  ])
}

function agrupar(eleicao: EleicaoDeputado): Agremiacao[] {
  const votosLegendaRecord = eleicao.votosLegenda instanceof Map
    ? Object.fromEntries(eleicao.votosLegenda)
    : eleicao.votosLegenda

  const mapa = new Map<string, Agremiacao>(
    eleicao.agremiacoes.map(nome => [nome, {
      nome,
      votosNominais: 0,
      votosLegenda: votosLegendaRecord[nome] ?? 0,
      votosValidos: 0,
      quocientePartidario: 0,
      vagasObtidas: 0,
      vagasSobras: 0,
      candidatos: [],
      eleitos: [],
    }]),
  )

  for (const VotosCandidato of eleicao.candidatos) {
    mapa.get(agremiacaoDe(VotosCandidato))!.candidatos.push(VotosCandidato)
  }

  const agremiacoes = [...mapa.values()]

  for (const agremiacao of agremiacoes) {
    agremiacao.candidatos = ordenarPorVotacao(agremiacao.candidatos)
    agremiacao.votosNominais = somarVotos(agremiacao.candidatos)
    agremiacao.votosValidos = agremiacao.votosNominais + agremiacao.votosLegenda
  }

  return agremiacoes
}

// Como os candidatos de cada agremiação já estão ordenados por votação, o
// próximo a ser eleito é sempre o primeiro que ainda não foi eleito.
function proximoCandidato(agremiacao: Agremiacao): VotosCandidato | undefined {
  return agremiacao.candidatos[agremiacao.eleitos.length]
}

// Primeira etapa (arts. 107 e 108): cada agremiação recebe tantas cadeiras
// quantas couberem no seu quociente partidário, preenchidas pelos mais votados
// que tenham ao menos 10% do QE. Cadeiras que ficam sem preencher viram sobras.
function distribuirPorQuociente(agremiacoes: Agremiacao[], quocienteEleitoral: number, vagas: number): void {
  let vagasPorQuociente = 0

  for (const agremiacao of agremiacoes) {
    agremiacao.quocientePartidario = calcularQuocientePartidario(agremiacao.votosValidos, quocienteEleitoral)
    agremiacao.vagasObtidas = agremiacao.quocientePartidario
    vagasPorQuociente += agremiacao.quocientePartidario
  }

  if (vagasPorQuociente > vagas) {
    throw new RangeError('Quociente eleitoral inconsistente: as vagas por quociente partidário excedem as vagas disponíveis.')
  }

  for (const agremiacao of agremiacoes) {
    const aptos = agremiacao.candidatos.filter(c => atingePercentual(c.votos, VOTACAO_MINIMA_CANDIDATO, quocienteEleitoral))

    agremiacao.eleitos = aptos.slice(0, agremiacao.quocientePartidario)
  }
}

function podeDisputarSobrasComClausula(agremiacao: Agremiacao, quocienteEleitoral: number): boolean {
  const proximo = proximoCandidato(agremiacao)

  return (
    proximo !== undefined
    && atingePercentual(agremiacao.votosValidos, VOTACAO_MINIMA_AGREMIACAO_SOBRAS, quocienteEleitoral)
    && atingePercentual(proximo.votos, VOTACAO_MINIMA_CANDIDATO_SOBRAS, quocienteEleitoral)
  )
}

function podeDisputarSobrasSemClausula(agremiacao: Agremiacao): boolean {
  return proximoCandidato(agremiacao) !== undefined
}

// Maior média primeiro: votos válidos / (cadeiras obtidas + 1). A comparação
// usa multiplicação cruzada para não depender de ponto flutuante.
// Empate de médias: vence quem tem mais votos válidos (Res.-TSE 23.677/2021,
// art. 11, § 6º) e, persistindo, quem tem o VotosCandidato mais votado disputando
// a vaga (§ 7º).
function compararPorMedia(a: Agremiacao, b: Agremiacao): number {
  const mediaA = a.votosValidos * (b.vagasObtidas + 1)
  const mediaB = b.votosValidos * (a.vagasObtidas + 1)
  if (mediaA !== mediaB) return mediaB - mediaA

  if (a.votosValidos !== b.votosValidos) return b.votosValidos - a.votosValidos

  const votosProximoA = proximoCandidato(a)?.votos ?? 0
  const votosProximoB = proximoCandidato(b)?.votos ?? 0
  return votosProximoB - votosProximoA
}

// Sobras (art. 109). Cada cadeira restante vai para a maior média entre as
// agremiações com 80% do QE e VotosCandidato com 20% do QE. Quando nenhuma atende
// às duas exigências, todas as agremiações disputam por maior média, sem
// cláusula (STF, ADI 7.228, 7.263 e 7.325, valendo desde 2024). Isso também
// vale quando nenhum partido atinge o quociente eleitoral.
function distribuirSobras(agremiacoes: Agremiacao[], quocienteEleitoral: number, vagas: number): void {
  const preenchidas = agremiacoes.reduce((acc, a) => acc + a.eleitos.length, 0)
  let restantes = vagas - preenchidas

  while (restantes > 0) {
    let disputantes = agremiacoes.filter(a => podeDisputarSobrasComClausula(a, quocienteEleitoral))

    if (disputantes.length === 0) {
      disputantes = agremiacoes.filter(podeDisputarSobrasSemClausula)
    }

    // Acabaram os candidatos: as cadeiras restantes ficam sem preenchimento.
    if (disputantes.length === 0) break

    const vencedora = disputantes.sort(compararPorMedia)[0]
    const eleito = proximoCandidato(vencedora)
    if (!eleito) break

    vencedora.eleitos.push(eleito)
    vencedora.vagasSobras += 1
    vencedora.vagasObtidas += 1
    restantes -= 1
  }
}

function paraResultado(agremiacao: Agremiacao): ResultadoAgremiacao {
  return {
    agremiacao: agremiacao.nome,
    votosNominais: agremiacao.votosNominais,
    votosLegenda: agremiacao.votosLegenda,
    votosValidos: agremiacao.votosValidos,
    quocientePartidario: agremiacao.quocientePartidario,
    vagasQuociente: agremiacao.eleitos.length - agremiacao.vagasSobras,
    vagasSobras: agremiacao.vagasSobras,
    eleitos: agremiacao.eleitos,
  }
}

// Apuração completa da eleição proporcional. Votos válidos = votos nominais
// mais votos de legenda; brancos e nulos não entram (Lei 9.504/97, art. 5º).
export function apurarDeputados(eleicao: EleicaoDeputado, vagas: number): ResultadoDeputado {
  validarEleicaoDeputado(eleicao, vagas)

  const agremiacoes = agrupar(eleicao)
  const votosValidos = agremiacoes.reduce((acc, a) => acc + a.votosValidos, 0)

  if (votosValidos === 0) {
    return {
      votosValidos,
      quocienteEleitoral: 0,
      agremiacoes: agremiacoes.map(paraResultado),
      eleitos: [],
    }
  }

  const quocienteEleitoral = calcularQuocienteEleitoral(votosValidos, vagas)

  distribuirPorQuociente(agremiacoes, quocienteEleitoral, vagas)
  distribuirSobras(agremiacoes, quocienteEleitoral, vagas)

  return {
    votosValidos,
    quocienteEleitoral,
    agremiacoes: agremiacoes.map(paraResultado),
    eleitos: ordenarPorVotacao(agremiacoes.flatMap(a => a.eleitos)),
  }
}

export function getDeputadosEleitos(eleicao: EleicaoDeputado, vagas: number): VotosCandidato[] {
  return apurarDeputados(eleicao, vagas).eleitos
}
