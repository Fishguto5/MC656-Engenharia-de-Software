'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'

function formatCpf(value: string) {
  return value.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export default function CadastrarAdminPage() {
  const [cpf, setCpf] = useState('')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setMessage('')
    setSuccess(false)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf }),
      })
      const result = await response.json() as { error?: string, result?: 'created' | 'promoted' }
      if (!response.ok) {
        setMessage(result.error ?? 'Não foi possível cadastrar o administrador.')
        return
      }

      setSuccess(true)
      setMessage(result.result === 'promoted'
        ? 'Permissão administrativa ativada para este CPF.'
        : 'Administrador cadastrado com sucesso.')
      setCpf('')
    }
    catch {
      setMessage('Não foi possível cadastrar o administrador. Tente novamente.')
    }
    finally {
      setPending(false)
    }
  }

  return (
    <main className="signup-page">
      <section className="signup-card" aria-labelledby="register-admin-title">
        <h1 id="register-admin-title">Cadastrar administrador</h1>
        <form className="signup-form" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="new-admin-cpf">CPF:</label>
            <input
              id="new-admin-cpf"
              name="cpf"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={event => setCpf(formatCpf(event.target.value))}
              aria-describedby={message ? 'register-admin-message' : undefined}
              required
            />
          </div>
          <button type="submit" className="primary-btn" disabled={pending}>
            {pending ? 'Salvando...' : 'Cadastrar'}
          </button>
          {message && (
            <p
              id="register-admin-message"
              className={success ? 'form-message success' : 'form-message'}
              role="status"
            >
              {message}
            </p>
          )}
          <Link className="primary-btn" href="/admin">Voltar ao painel</Link>
        </form>
      </section>
    </main>
  )
}
