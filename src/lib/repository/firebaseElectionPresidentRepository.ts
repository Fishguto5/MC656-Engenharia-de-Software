import { getDateYearsAgo } from '../date/date'

/* Idade mínima para Presidente = 35 anos */
export const MINIMUM_PRESIDENT_AGE = 35
export const maxPresidentDoB = () => {
  return getDateYearsAgo(MINIMUM_PRESIDENT_AGE)
}
