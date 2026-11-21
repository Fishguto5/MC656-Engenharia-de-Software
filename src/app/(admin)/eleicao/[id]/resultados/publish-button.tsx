'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function PublishButton({ electionId }: { electionId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function publish() {
    setPending(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/elections/${encodeURIComponent(electionId)}/publish`, { method: 'POST' })
      const data = await response.json() as { error?: string }
      if (!response.ok) {
        setError(data.error ?? 'Não foi possível publicar o resultado.')
        return
      }
      router.refresh()
    }
    catch {
      setError('Não foi possível publicar o resultado. Tente novamente.')
    }
    finally {
      setPending(false)
    }
  }

  return (
    <div>
      <button type="button" className="primary-btn" onClick={publish} disabled={pending}>
        {pending ? 'Publicando...' : 'Autorizar publicação dos resultados'}
      </button>
      {error && <p role="alert" className="form-message">{error}</p>}
    </div>
  )
}
