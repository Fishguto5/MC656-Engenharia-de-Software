'use client'

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

          <button type="submit">Acessar</button>

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
    </main>
  )
}
