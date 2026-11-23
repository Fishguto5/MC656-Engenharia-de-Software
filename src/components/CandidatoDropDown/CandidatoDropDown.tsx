'use client'

import { useRef, useEffect, useState, KeyboardEvent } from 'react'
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
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

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
    // Devolve o foco para o botão principal após selecionar
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const handleRemove = (option: VotosCandidato) => {
    onChange(selectedList.filter(item => item.id !== option.id))
  }

  const handleReset = () => {
    onChange([])
    setIsOpen(false)
  }

  // Navegação por teclado no botão principal (Trigger)
  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' && options.length > 0) {
      e.preventDefault()
      setIsOpen(true)
      requestAnimationFrame(() => optionRefs.current[0]?.focus())
    }
    else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  // Navegação por teclado dentro da lista de opções (Setas, Home, End, Escape, Tab)
  const handleOptionKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (index + 1) % options.length
      optionRefs.current[nextIndex]?.focus()
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (index === 0) {
        triggerRef.current?.focus()
      }
      else {
        optionRefs.current[index - 1]?.focus()
      }
    }
    else if (e.key === 'Home') {
      e.preventDefault()
      optionRefs.current[0]?.focus()
    }
    else if (e.key === 'End') {
      e.preventDefault()
      optionRefs.current[options.length - 1]?.focus()
    }
    else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
      triggerRef.current?.focus()
    }
    else if (e.key === 'Tab' && !e.shiftKey && index === options.length - 1) {
      // Fecha o menu naturalmente ao dar Tab para fora do último item
      setIsOpen(false)
    }
  }

  return (
    <div className={styles.container} ref={containerRef}>
      {/* Dropdown Section */}
      <div className={styles.dropdownContainer}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleTriggerKeyDown}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
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
          <div className={styles.dropdownMenu} role="listbox">
            {options.map((option, index) => (
              <button
                key={option.id}
                ref={(el) => { optionRefs.current[index] = el }}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => handleSelect(option)}
                onKeyDown={e => handleOptionKeyDown(e, index)}
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
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected List Section */}
      <div className={styles.selectedSection}>
        <div className={styles.headerRow}>
          <h2>
            Candidatos selecionados (
            {selectedList.length}
            )
          </h2>
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
