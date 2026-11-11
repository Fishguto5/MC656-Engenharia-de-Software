export function omitId<T extends { id?: string }>(obj: T): Omit<T, 'id'> {
  const copy = { ...obj }
  delete copy.id
  return copy
}
