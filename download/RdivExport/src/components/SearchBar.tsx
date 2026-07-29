// ─── RdivExport – Barre de recherche produits ────────────────────────────────
// Barre de recherche avec icône, microphone (recherche vocale), bouton
// d'effacement et liste déroulante de résultats. Mobile-first avec des
// zones tactiles minimales de 44px.

import { useState, useRef, useEffect, useCallback } from 'react'
import { useProducts } from '@/hooks/useProducts'
import { useVoiceSearch } from '@/hooks/useVoiceSearch'
import { formatQuantity } from '@/utils/formatters'
import type { Product } from '@/types'

// ─── Types ──────────────────────────────────────────────────────────────────

interface SearchBarProps {
  onSelect: (product: Product) => void
  placeholder?: string
}

// ─── Composant ──────────────────────────────────────────────────────────────

export function SearchBar({ onSelect, placeholder = 'Rechercher un produit…' }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const { products, loading, search, clearSearch } = useProducts()
  const {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
  } = useVoiceSearch()

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Gestion de la saisie texte avec debounce intégré dans useProducts ──
  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value)
      if (value.trim()) {
        search(value)
        setIsDropdownOpen(true)
      } else {
        clearSearch()
        setIsDropdownOpen(false)
      }
    },
    [search, clearSearch],
  )

  // ── Réception du transcript vocal ──
  useEffect(() => {
    if (transcript) {
      handleInputChange(transcript)
    }
  }, [transcript, handleInputChange])

  // ── Sélection d'un produit ──
  const handleSelect = useCallback(
    (product: Product) => {
      onSelect(product)
      setQuery('')
      clearSearch()
      setIsDropdownOpen(false)
      inputRef.current?.blur()
    },
    [onSelect, clearSearch],
  )

  // ── Fermer le dropdown au clic extérieur ──
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isDropdownOpen])

  // ── Toggle microphone ──
  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  // ── Effacer ──
  const handleClear = useCallback(() => {
    handleInputChange('')
  }, [handleInputChange])

  return (
    <div ref={containerRef} className="relative w-full">
      {/* ── Barre de recherche ── */}
      <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
        {/* Icône recherche */}
        <div className="flex h-11 min-h-[44px] w-11 items-center justify-center pl-3 text-gray-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (products.length > 0 && query.trim()) {
              setIsDropdownOpen(true)
            }
          }}
          placeholder={placeholder}
          className="h-11 min-h-[44px] flex-1 border-0 bg-transparent py-0 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          autoComplete="off"
          enterKeyHint="search"
        />

        {/* Bouton microphone */}
        {isSupported && (
          <button
            type="button"
            onClick={handleMicToggle}
            className={`flex h-11 min-h-[44px] w-11 items-center justify-center rounded-lg transition-colors focus:outline-none ${
              isListening
                ? 'animate-pulse bg-red-100 text-red-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
            aria-label={isListening ? 'Arrêter la recherche vocale' : 'Recherche vocale'}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          </button>
        )}

        {/* Bouton effacer */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="flex h-11 min-h-[44px] w-11 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none"
            aria-label="Effacer la recherche"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Dropdown résultats ── */}
      {isDropdownOpen && (products.length > 0 || loading) && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {/* Chargement */}
          {loading && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Recherche en cours…
            </div>
          )}

          {/* Liste de produits */}
          {!loading && products.length > 0 && (
            <ul className="max-h-64 overflow-y-auto" role="listbox">
              {products.map((product) => (
                <li
                  key={product.id}
                  role="option"
                  aria-selected={false}
                  onClick={() => handleSelect(product)}
                  className="flex cursor-pointer items-center justify-between border-b border-gray-100 px-4 py-3 transition-colors last:border-b-0 hover:bg-blue-50 active:bg-blue-100"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {product.name}
                    </p>
                    {product.code && (
                      <p className="truncate text-xs text-gray-500">
                        {product.code}
                      </p>
                    )}
                  </div>
                  <div className="ml-3 flex-shrink-0 text-right">
                    <p className="text-xs font-medium text-gray-600">
                      Stock : {formatQuantity(product.main_depot_stock)}
                    </p>
                    {product.unit && (
                      <p className="text-xs text-gray-400">{product.unit}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
