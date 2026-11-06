import { Timestamp } from 'firebase/firestore'

export function getDateYearsAgo(years: number): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() - years)

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')

  return `${yyyy}-${mm}-${dd}`
}

export function InputDateToDate(date: string): Date | null {
  const regex = /^\d{4}-\d{2}-\d{2}$/

  if (regex.test(date)) {
    const [year, month, day] = date.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  return null
}

export function isValidTimeFrame(start: Timestamp, end: Timestamp): boolean {
  const dateStart = start.toDate()
  dateStart.setHours(0, 0, 0, 0)

  const dateEnd = end.toDate()
  dateEnd.setHours(0, 0, 0, 0)

  // Garante que o dia de início é anterior ou igual ao dia de término
  return dateStart <= dateEnd
}

// Aceita Timestamp, Date, string ISO, objeto com segundos (legado Firestore) ou null/undefined
export type RawDateInput = Timestamp | Date | string | { seconds: number, nanoseconds: number } | null | undefined

export function RawDocumentTimeToDate(
  dateInput: RawDateInput,
  fallbackDate: Date = new Date(),
): Date {
  if (!dateInput) {
    return fallbackDate
  }

  let parsedDate: Date

  if (dateInput instanceof Timestamp) {
    parsedDate = dateInput.toDate()
  }
  else if (dateInput instanceof Date) {
    parsedDate = dateInput
  }
  else if (typeof dateInput === 'object' && 'seconds' in dateInput && typeof dateInput.seconds === 'number') {
    parsedDate = new Date(dateInput.seconds * 1000)
  }
  else if (typeof dateInput === 'string') {
    parsedDate = new Date(dateInput)
  }
  else {
    return fallbackDate
  }

  // Valida se a data gerada é um Date válido (NaN ocorre quando a conversão falha)
  if (isNaN(parsedDate.getTime())) {
    return fallbackDate
  }

  return parsedDate
}
