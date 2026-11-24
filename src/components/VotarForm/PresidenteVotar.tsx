'use client'

import { EleicaoPresidente } from '@/interfaces/eleicaoInterfaces'
import { ChangeEvent, useState } from 'react'
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog'
import styles from './votarForm.module.css'
import { CandidatosDialog } from '../CandidatosDialog/CandidatosDialog'

interface Props {
  election: EleicaoPresidente
  onSubmit: (payload: { type: 'president', candidateNumber: number }) => Promise<void>
}

export function PresidenteVotarForm({ election, onSubmit }: Props) {
  const [number, setNumber] = useState<number>(0)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isCandidatesOpen, setIsCandidatesOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const candidato = election.candidatos.find(cand => cand.numero === number)

  function formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0') // Mês começa em 0
    const year = date.getFullYear()

    return `${day}/${month}/${year}`
  }

  const getVoteDescription = () => {
    if (candidato) {
      return `Você selecionou o candidato ${candidato.nome} (${number} - ${candidato.partido}) para "${election.title}". Deseja confirmar seu voto? Esta ação não poderá ser desfeita.`
    }
    if (number === 0) {
      return `Você selecionou "Voto em Branco" para "${election.title}". Deseja confirmar seu voto? Esta ação não poderá ser desfeita.`
    }
    return `O número ${number} não corresponde a nenhum candidato e será registrado como "Voto Nulo" para "${election.title}". Deseja confirmar seu voto? Esta ação não poderá ser desfeita.`
  }

  const handleFormSubmit = (e: React.SubmitEvent) => {
    e.preventDefault()
    setIsConfirmOpen(true)
  }

  const handleConfirmVote = async () => {
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      await onSubmit({ type: 'president', candidateNumber: number })
      setIsConfirmOpen(false)
    }
    finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setNumber(0)
    setIsConfirmOpen(false)
  }

  const handleFieldChange = (e: ChangeEvent<HTMLInputElement>) => {
    const texto = e.target.value

    if (texto === '') {
      setNumber(0)
      return
    }

    const num = Number(texto)
    if (Number.isNaN(num)) {
      setNumber(0)
      return
    }
    setNumber(num < 0 ? -num : num)
  }

  return (
    <>
      <form onSubmit={handleFormSubmit} onReset={handleReset} className="votar-form">
        <div className="VotarForm-title-container">
          <h1 className="no-margin">{election.title}</h1>
          <div className="w-full flex flex-row justify-end items-center">
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

        <fieldset className={`form-field ${styles.formField}`}>
          <div className={styles.labelRow}>
            <label htmlFor="president">Número do Candidato</label>
            <button
              type="button"
              onClick={() => setIsCandidatesOpen(true)}
              className={styles.helpBtn}
              disabled={isSubmitting}
              title="Ver lista de candidatos"
              aria-label="Ver lista de candidatos"
            >
              ?
            </button>
          </div>

          <input
            type="number"
            name="president"
            id="president"
            value={number}
            onChange={handleFieldChange}
            min={0}
            disabled={isSubmitting}
          />
        </fieldset>

        <div className="flex w-full justify-center">
          {candidato
            ? (
                <div className={styles.card}>
                  <h2 className={styles.nome}>{candidato.nome}</h2>
                  <p className={styles.badge}>
                    {candidato.partido}
                  </p>
                </div>
              )
            : number === 0
              ? (
                  <div className={styles.card}>
                    <h2 className={styles.nome}>Voto em Branco</h2>
                  </div>
                )
              : (
                  <div className={styles.card}>
                    <h2 className={styles.nome}>Voto Nulo</h2>
                  </div>
                )}
        </div>

        <div className="VotarForm-btn-container">
          <button type="reset" className="primary-btn cancel-btn" disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className="primary-btn confirm-btn" disabled={isSubmitting}>
            Confirmar
          </button>
        </div>
      </form>

      <CandidatosDialog
        open={isCandidatesOpen}
        title={`Candidatos — ${election.title}`}
        candidatos={election.candidatos}
        onSelect={numero => setNumber(numero)}
        onClose={() => setIsCandidatesOpen(false)}
      />

      <ConfirmDialog
        open={isConfirmOpen}
        title="Confirmar voto"
        description={getVoteDescription()}
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
