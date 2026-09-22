import {
  Candidato,
  ordenarPorVotacao,
  somarVotos,
  validarVotos,
} from './eleicao'

// Percentuais do quociente eleitoral (QE) exigidos pelo Código Eleitoral.
// Art. 108: votação nominal mínima do candidato para ser eleito pelo quociente.
export const VOTACAO_MINIMA_CANDIDATO = 10
// Art. 109, § 2º: votação mínima do partido/federação para disputar as sobras...
export const VOTACAO_MINIMA_AGREMIACAO_SOBRAS = 80
// ...e do candidato que vai ocupar a vaga (só na primeira fase das sobras).
export const VOTACAO_MINIMA_CANDIDATO_SOBRAS = 20

// Vagas de Deputado Federal por circunscrição nas Eleições 2026 (LC 78/1993).
// O STF manteve as 513 cadeiras e o projeto que criava 531 foi vetado.
// CF, art. 45, § 1º: mínimo de 8 e máximo de 70 por unidade da federação.
export const VAGAS_DEPUTADO_FEDERAL = {
  AC: 8,
  AL: 9,
  AM: 8,
  AP: 8,
  BA: 39,
  CE: 22,
  DF: 8,
  ES: 10,
  GO: 17,
  MA: 18,
  MG: 53,
  MS: 8,
  MT: 8,
  PA: 17,
  PB: 12,
  PE: 25,
  PI: 10,
  PR: 30,
  RJ: 46,
  RN: 8,
  RO: 8,
  RR: 8,
  RS: 31,
  SC: 16,
  SE: 8,
  SP: 70,
  TO: 8,
}

export type UF = keyof typeof VAGAS_DEPUTADO_FEDERAL

// Eleição proporcional de uma circunscrição (Deputado Federal, Estadual ou
// Distrital). `vagas` é o número de cadeiras em disputa. `votosLegenda` guarda
// os votos dados só ao partido (ou à federação), indexados pelo nome da
// agremiação: o campo `federacao` do candidato, se houver, ou o `partido`.
export type VotacaoDeputado = {
  id: string
  data: Date
  vagas: number
  candidatos: Candidato[]
  votosLegenda: Record<string, number>
  votosBrancos: number
  votosNulos: number
}

export type ResultadoAgremiacao = {
  agremiacao: string
  votosNominais: number
  votosLegenda: number
  votosValidos: number
  quocientePartidario: number
  // Cadeiras preenchidas na primeira etapa (quociente partidário).
  vagasQuociente: number
  // Cadeiras conquistadas na distribuição das sobras (maiores médias).
  vagasSobras: number
  eleitos: Candidato[]
}

export type ResultadoDeputado = {
  votosValidos: number
  quocienteEleitoral: number
  agremiacoes: ResultadoAgremiacao[]
  // Todos os eleitos, em ordem decrescente de votação nominal.
  eleitos: Candidato[]
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
  candidatos: Candidato[]
  eleitos: Candidato[]
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

function agremiacaoDe(candidato: Candidato): string {
  return candidato.federacao ?? candidato.partido
}

// votos >= percentual% do QE, só com inteiros (sem erro de ponto flutuante).
function atingePercentual(votos: number, percentual: number, quocienteEleitoral: number): boolean {
  return votos * 100 >= quocienteEleitoral * percentual
}

function validarVotacaoDeputado(votacao: VotacaoDeputado): void {
  if (!Number.isInteger(votacao.vagas) || votacao.vagas <= 0) {
    throw new RangeError('O número de vagas deve ser um inteiro positivo.')
  }

  validarVotos([
    ...votacao.candidatos.map(c => c.votos),
    ...Object.values(votacao.votosLegenda),
    votacao.votosBrancos,
    votacao.votosNulos,
  ])
}

function agrupar(votacao: VotacaoDeputado): Agremiacao[] {
  const mapa = new Map<string, Agremiacao>()

  const obter = (nome: string): Agremiacao => {
    let agremiacao = mapa.get(nome)

    if (!agremiacao) {
      agremiacao = {
        nome,
        votosNominais: 0,
        votosLegenda: 0,
        votosValidos: 0,
        quocientePartidario: 0,
        vagasObtidas: 0,
        vagasSobras: 0,
        candidatos: [],
        eleitos: [],
      }
      mapa.set(nome, agremiacao)
    }

    return agremiacao
  }

  for (const candidato of votacao.candidatos) {
    obter(agremiacaoDe(candidato)).candidatos.push(candidato)
  }

  for (const [nome, votos] of Object.entries(votacao.votosLegenda)) {
    obter(nome).votosLegenda = votos
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
function proximoCandidato(agremiacao: Agremiacao): Candidato | undefined {
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
// art. 11, § 6º) e, persistindo, quem tem o candidato mais votado disputando
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
// agremiações com 80% do QE e candidato com 20% do QE. Quando nenhuma atende
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
export function apurarDeputados(votacao: VotacaoDeputado): ResultadoDeputado {
  validarVotacaoDeputado(votacao)

  const agremiacoes = agrupar(votacao)
  const votosValidos = agremiacoes.reduce((acc, a) => acc + a.votosValidos, 0)

  if (votosValidos === 0) {
    return {
      votosValidos,
      quocienteEleitoral: 0,
      agremiacoes: agremiacoes.map(paraResultado),
      eleitos: [],
    }
  }

  const quocienteEleitoral = calcularQuocienteEleitoral(votosValidos, votacao.vagas)

  distribuirPorQuociente(agremiacoes, quocienteEleitoral, votacao.vagas)
  distribuirSobras(agremiacoes, quocienteEleitoral, votacao.vagas)

  return {
    votosValidos,
    quocienteEleitoral,
    agremiacoes: agremiacoes.map(paraResultado),
    eleitos: ordenarPorVotacao(agremiacoes.flatMap(a => a.eleitos)),
  }
}

export function getDeputadosEleitos(votacao: VotacaoDeputado): Candidato[] {
  return apurarDeputados(votacao).eleitos
}
