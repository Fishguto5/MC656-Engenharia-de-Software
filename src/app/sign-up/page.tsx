'use client'

import { saveVoterSession } from '@/lib/voterSession'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

export function isValidCpf(value: string) {
  const cpf = onlyDigits(value)

  if (cpf.length !== 11 || /^([0-9])\1+$/.test(cpf)) {
    return false
  }

  const calculateDigit = (length: number) => {
    let sum = 0

    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index)
    }

    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }

  return (
    calculateDigit(9) === Number(cpf[9])
    && calculateDigit(10) === Number(cpf[10])
  )
}

export function formatCpf(value: string) {
  const cpf = onlyDigits(value).slice(0, 11)

  return cpf
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export default function SignUpPage() {
  const router = useRouter()
  const [cpf, setCpf] = useState('')
  const [name, setName] = useState('')
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

    setMessage('')
    try {
      saveVoterSession({ cpf: onlyDigits(cpf), name: trimmedName })
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

          <button type="submit" className="primary-btn">Acessar</button>

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
    </main>
  )
}
