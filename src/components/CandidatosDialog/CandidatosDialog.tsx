'use client'

import { useEffect, useRef } from 'react'
import styles from './CandidatosDialog.module.css'

export interface CandidatoItem {
  nome: string
  numero: number
  partido: string
  federacao?: string
}

interface CandidatosDialogProps {
  open: boolean
  title?: string
  candidatos: CandidatoItem[]
  showFederacao?: boolean
  onSelect?: (numero: number) => void
  onClose: () => void
}

export function CandidatosDialog({
  open,
  title = 'Candidatos disponíveis',
  candidatos,
  showFederacao = false,
  onSelect,
  onClose,
}: CandidatosDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
    }
    else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
      className={styles.dialog}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className={styles.closeBtn}
          aria-label="Fechar lista de candidatos"
        >
          Fechar
        </button>
      </div>

      {candidatos.length === 0
        ? (
            <p className={styles.empty}>Nenhum candidato cadastrado.</p>
          )
        : (
            <ul className={styles.list}>
              {candidatos.map(cand => (
                <li key={cand.numero}>
                  <button
                    type="button"
                    className={styles.item}
                    onClick={() => {
                      onSelect?.(cand.numero)
                      onClose()
                    }}
                  >
                    <div className={styles.candidateInfo}>
                      <span className={styles.candidateName}>{cand.nome}</span>
                      <span className={styles.candidateParty}>
                        {showFederacao ? (cand.federacao || cand.partido) : cand.partido}
                      </span>
                    </div>
                    <span className={styles.candidateNumber}>{cand.numero}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
    </dialog>
  )
}
