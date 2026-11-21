import type { Metadata } from 'next'
import ElectionsClientView from './ElectionsClientView'

export const metadata: Metadata = {
  title: 'Eleições disponíveis',
  description: 'Consulte o status e o tipo das votações.',
}

export default function ElectionsPage() {
  return <ElectionsClientView />
}
