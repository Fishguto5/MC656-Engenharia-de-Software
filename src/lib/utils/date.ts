import { Timestamp } from 'firebase/firestore'

export function getDateYearsAgo(years: number): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() - years)

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')

  return `${yyyy}-${mm}-${dd}`
}
export function RawDocumentTimeToDate(date: Timestamp | string): Date {
  let newDate = new Date()
  if (date instanceof Timestamp) {
    newDate = date.toDate()
  }
  else if (typeof date === 'string') {
    newDate = new Date(date)
  }

  return newDate
}

export function InputDateToDate(date: string): Date | null {
  const regex = /^\d{4}-\d{2}-\d{2}$/

  if (regex.test(date)) {
    const [year, month, day] = date.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  return null
}
