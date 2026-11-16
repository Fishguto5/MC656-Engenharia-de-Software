'use client'

import { useRef, useEffect, useState } from 'react'
import styles from './CandidatoDropDown.module.css'
import { Candidato, VotosCandidato } from '@/interfaces/eleicaoInterfaces'
import { FormElectionData } from '../EleicaoForm/EleicaoContext'

interface CandidatoDropDownProps {
  formData: FormElectionData
  onChange: (updatedCandidates: VotosCandidato[]) => void
  initialCandidatos: Candidato[]
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function CandidatoDropDown({
  formData,
  onChange,
  initialCandidatos,
  onInputChange,
}: CandidatoDropDownProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false) // apenas controle visual de abertura
  const containerRef = useRef<HTMLDivElement>(null)

  // lista de selecionados
  const selectedList = formData.candidates || []

  // As opções disponíveis são todas as iniciais menos as que já estão selecionadas
  const options = initialCandidatos.filter(
    item => !selectedList.some(selected => selected.id === item.id),
  )

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (option: Candidato) => {
    onChange([...selectedList,
      {
        ...option,
        votos: 0,
        numero: 0,
      },
    ])
    setIsOpen(false)
  }

  const handleRemove = (option: VotosCandidato) => {
    onChange(selectedList.filter(item => item.id !== option.id))
  }

  const handleReset = () => {
    onChange([])
    setIsOpen(false)
  }

  return (
    <div className={styles.container} ref={containerRef}>
      {/* Dropdown Section */}
      <div className={styles.dropdownContainer}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={styles.triggerButton}
        >
          <span className={styles.placeholder}>
            {options.length > 0 ? 'Selecione um candidato...' : 'Todos candidatos selecionados'}
          </span>
          <svg className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && options.length > 0 && (
          <div className={styles.dropdownMenu}>
            {options.map(option => (
              <div
                key={option.id}
                onClick={() => handleSelect(option)}
                className={styles.cardItem}
              >
                <div className={styles.cardInfo}>
                  <h4>{option.nome}</h4>
                  <p>
                    {option.partido}
                    {' '}
                    {option.federacao && ('| ' + option.federacao)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected List Section */}
      <div className={styles.selectedSection}>
        <div className={styles.headerRow}>
          <h3>
            Candidatos selecionados (
            {selectedList.length}
            )
          </h3>
          {selectedList.length > 0 && (
            <button type="button" onClick={handleReset} className={styles.resetButton}>
              Limpar tudo
            </button>
          )}
        </div>

        {selectedList.length === 0
          ? (
              <p className={styles.emptyText}>Nenhum candidato selecionado ainda.</p>
            )
          : (
              <div className={styles.selectedList}>
                {selectedList.map(item => (
                  <div key={item.id} className={styles.selectedCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexDirection: 'column' }}>
                      <div className={styles.cardInfo}>
                        <h4>{item.nome}</h4>
                        <p>
                          {item.partido}
                          {' '}
                          {item.federacao && ('| ' + item.federacao)}
                        </p>
                      </div>
                      <div className="form-field">
                        <label htmlFor={`numero-${item.id}`}>Número</label>
                        <input
                          type="number"
                          name={`numero-${item.id}`}
                          id={`numero-${item.id}`}
                          min={1}
                          value={item.numero}
                          onChange={onInputChange}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(item)}
                      className={styles.removeButton}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
      </div>
    </div>
  )
}
