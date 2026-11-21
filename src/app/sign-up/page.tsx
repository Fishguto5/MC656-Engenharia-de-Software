'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { formatCpf, isValidCpf } from '@/lib/utils/cpf'

export default function SignUpPage() {
  const [cpf, setCpf] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()

    if (!trimmedName) {
      setIsSuccess(false)
      setMessage('Informe seu nome.')
      return
    }

    if (!isValidCpf(cpf)) {
      setIsSuccess(false)
      setMessage('Informe um CPF válido.')
      return
    }

    setIsSuccess(true)
    setMessage('CPF validado com sucesso.')
  }

  return (
    <main className="signup-page">
      <section className="signup-card" aria-labelledby="signup-title">
        <h1 id="signup-title">ÁREA DO ADMINISTRADOR</h1>

        <form className="signup-form" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="cpf">CPF:</label>
            <input
              id="cpf"
              name="cpf"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={event => setCpf(formatCpf(event.target.value))}
              aria-describedby={message ? 'form-message' : undefined}
            />
          </div>

          <div className="form-field">
            <label htmlFor="name">Nome:</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={event => setName(event.target.value)}
              aria-describedby={message ? 'form-message' : undefined}
            />
          </div>

          <button type="submit" className="primary-btn">Acessar</button>
          <Link href="/resultados" className="primary-btn">Consultar resultados publicados</Link>

          {message && (
            <p
              id="form-message"
              className={isSuccess ? 'form-message success' : 'form-message'}
              role="status"
            >
              {message}
            </p>
          )}
        </form>
      </section>
      <Link href="/admin/login" className="primary-btn admin-login-link">
        Entrar como administrador
      </Link>
    </main>
  )
}
