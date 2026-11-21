'use client'

import Link from 'next/link'
import { LISTA_UFS, type UF } from '@/lib/constants/election'
import { saveVoterSession } from '@/lib/voterSession'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { formatCpf, isValidCpf, onlyDigits } from '@/lib/utils/cpf'

export default function SignUpPage() {
  const router = useRouter()
  const [cpf, setCpf] = useState('')
  const [name, setName] = useState('')
  const [uf, setUf] = useState<UF | ''>('')
  const [message, setMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()

    if (!trimmedName) {
      setMessage('Informe seu nome.')
      return
    }

    if (!isValidCpf(cpf)) {
      setMessage('Informe um CPF válido.')
      return
    }

    if (!uf) {
      setMessage('Selecione a UF do domicílio eleitoral.')
      return
    }

    setMessage('')
    try {
      saveVoterSession({ cpf: onlyDigits(cpf), name: trimmedName, uf })
      router.push('/eleicoes')
    }
    catch {
      setMessage('Não foi possível acessar as eleições. Tente novamente.')
    }
  }

  return (
    <main className="signup-page">
      <section className="signup-card" aria-labelledby="signup-title">
        <h1 id="signup-title">ÁREA DO ELEITOR</h1>

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

          <div className="form-field signup-uf-field">
            <label htmlFor="uf">UF do domicílio eleitoral:</label>
            <select
              id="uf"
              name="uf"
              value={uf}
              required
              onChange={event => setUf(event.target.value as UF | '')}
              aria-describedby={message ? 'form-message' : undefined}
            >
              <option value="">Selecione a UF</option>
              {LISTA_UFS.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          <button type="submit" className="primary-btn">Acessar</button>
          <Link href="/resultados" className="primary-btn">Consultar resultados publicados</Link>

          {message && (
            <p
              id="form-message"
              className="form-message"
              role="alert"
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
