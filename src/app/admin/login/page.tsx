'use client'

import { useState, type FormEvent } from 'react'

function formatCpf(value: string) {
  return value.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export default function AdminLoginPage() {
  const [cpf, setCpf] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ cpf }),
      })
      if (!response.ok) {
        const result = await response.json() as { error?: string }
        setMessage(result.error ?? 'Não foi possível autenticar. Tente novamente.')
        return
      }
      window.location.replace('/admin')
    }
    catch {
      setMessage('Não foi possível autenticar. Tente novamente.')
    }
    finally {
      setPending(false)
    }
  }

  return (
    <main className="signup-page">
      <section className="signup-card" aria-labelledby="login-title">
        <h1 id="login-title">ÁREA DO ADMINISTRADOR</h1>
        <form className="signup-form" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="admin-cpf">CPF:</label>
            <input
              id="admin-cpf"
              name="cpf"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={event => setCpf(formatCpf(event.target.value))}
              aria-describedby={message ? 'admin-login-message' : undefined}
            />
          </div>
          <button type="submit" className="primary-btn" disabled={pending}>
            {pending ? 'Aguarde...' : 'Acessar'}
          </button>
          {message && <p id="admin-login-message" className="form-message" role="alert">{message}</p>}
        </form>
      </section>
    </main>
  )
}
