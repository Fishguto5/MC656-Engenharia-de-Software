'use client'

import { ConsultaPublica } from '@/interfaces/eleicaoInterfaces'
import { useState } from 'react'
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog'

interface Props {
  election: ConsultaPublica
  onSubmit: (payload: { type: 'public-consultation', proposalApproved: boolean }) => Promise<void>
}

export function ConsultaPublicaVotarForm({ election, onSubmit }: Props) {
  const [choice, setChoice] = useState<boolean | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0') // Mês começa em 0
    const year = date.getFullYear()

    return `${day}/${month}/${year}`
  }

  const handleFormSubmit = (e: React.SubmitEvent) => {
    e.preventDefault()
    if (choice === null) return
    setIsConfirmOpen(true)
  }

  const handleConfirmVote = async () => {
    if (choice === null || isSubmitting) return

    try {
      setIsSubmitting(true)
      await onSubmit({ type: 'public-consultation', proposalApproved: choice })
      setIsConfirmOpen(false)
    }
    finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setChoice(null)
    setIsConfirmOpen(false)
  }

  return (
    <>
      <form onSubmit={handleFormSubmit} onReset={handleReset} className="votar-form">
        <div className="VotarForm-title-container">
          <h1 className="no-margin">{election.title}</h1>
          <div className="w-full flex flex-row justify-between items-center">
            <p className="local">
              📌
              {election.local}
            </p>
            <p>
              disponível até:
              {formatDate(election.endsAt)}
            </p>
          </div>

          <p>
            <span className="font-bold">Dispõe sobre</span>
            {' '}
            {election.description}
          </p>
        </div>

        <fieldset className="form-field-radix">
          <div className="form-option">
            <input
              type="radio"
              name="proposalApproved"
              id="approved"
              checked={choice === true}
              onChange={() => setChoice(true)}
            />
            <label htmlFor="approved">Apoio</label>
          </div>

          <hr className="radix-hr" />

          <div className="form-option">
            <input
              type="radio"
              name="proposalApproved"
              id="disapproved"
              checked={choice === false}
              onChange={() => setChoice(false)}
            />
            <label htmlFor="disapproved">Não Apoio</label>
          </div>
        </fieldset>

        <div className="VotarForm-btn-container">
          <button type="reset" className="primary-btn cancel-btn" disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className="primary-btn confirm-btn" disabled={choice === null || isSubmitting}>
            Confirmar
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={isConfirmOpen}
        title="Confirmar voto"
        description={`Você selecionou "${choice ? 'Apoio' : 'Não Apoio'}" para "${election.title}". Deseja confirmar seu voto? Esta ação não poderá ser desfeita.`}
        confirmLabel="Confirmar voto"
        cancelLabel="Voltar"
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmVote}
        onCancel={() => {
          if (!isSubmitting) setIsConfirmOpen(false)
        }}
      />
    </>
  )
}
