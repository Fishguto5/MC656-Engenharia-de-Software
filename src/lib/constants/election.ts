// --- IDADES ----
/* Idade mínima para Deputado = 21 anos (art. 14, § 3º, VI, c da CF) */
export const MINIMUM_DEPUTY_AGE = 21
/* Idade mínima para Presidente = 35 anos */
export const MINIMUM_PRESIDENT_AGE = 35

export const MINIMUM_AGE = MINIMUM_DEPUTY_AGE

// --- UF ----
export const LISTA_UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR',
  'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
] as const

export type UF = typeof LISTA_UFS[number]

// --- Tipos de Eleição
const LISTA_ELECTION_TYPES = ['president', 'deputy', 'public-consultation'] as const
export const VALID_ELECTION_TYPE = new Set<string>(LISTA_ELECTION_TYPES)
export type ElectionType = typeof LISTA_ELECTION_TYPES[number]

// --- DEPUTADO ----
// Percentuais do quociente eleitoral (QE) exigidos pelo Código Eleitoral.
// Art. 108: votação nominal mínima do VotosCandidato para ser eleito pelo quociente.
export const VOTACAO_MINIMA_CANDIDATO = 10
// Art. 109, § 2º: votação mínima do partido/federação para disputar as sobras...
export const VOTACAO_MINIMA_AGREMIACAO_SOBRAS = 80
// ...e do VotosCandidato que vai ocupar a vaga (só na primeira fase das sobras).
export const VOTACAO_MINIMA_CANDIDATO_SOBRAS = 20

// Vagas de Deputado Federal por circunscrição nas Eleições 2026 (LC 78/1993).
// O STF manteve as 513 cadeiras e o projeto que criava 531 foi vetado.
// CF, art. 45, § 1º: mínimo de 8 e máximo de 70 por unidade da federação.
export const VAGAS_DEPUTADO_FEDERAL: Record<UF, number> = {
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
} as const
