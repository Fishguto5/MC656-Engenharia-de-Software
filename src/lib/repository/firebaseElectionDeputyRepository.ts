import { getDateYearsAgo } from '../date/date'

/* Idade mínima para Deputado = 21 anos */
export const MINIMUM_DEPUTY_AGE = 21
export const maxDeputyDoB = () => {
  return getDateYearsAgo(MINIMUM_DEPUTY_AGE)
}
