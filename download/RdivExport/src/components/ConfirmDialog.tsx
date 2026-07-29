// ─── RdivExport – Boîte de dialogue de confirmation ─────────────────────────
// Modale de confirmation centrée avec overlay semi-transparent.
// Utilisée pour les actions destructrices (suppression, annulation, etc.)

import { useEffect, useCallback, useRef } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
}

// ─── Classes de variante ────────────────────────────────────────────────────

const CONFIRM_BUTTON_CLASSES = {
  danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 active:bg-red-800',
  warning: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500 active:bg-yellow-700',
  default: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 active:bg-blue-800',
} as const

// ─── Composant ──────────────────────────────────────────────────────────────

export function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const previousActiveElement = useRef<Element | null>(null)

  // ── Focus trap : focus sur le bouton confirmer à l'ouverture ──
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement
      // Petit délai pour laisser le DOM se mettre à jour
      const timeout = setTimeout(() => {
        confirmButtonRef.current?.focus()
      }, 50)
      return () => clearTimeout(timeout)
    } else {
      // Restaurer le focus au fermerture
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus()
      }
    }
  }, [isOpen])

  // ── Fermer avec Escape ──
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  // ── Empêcher le scroll du body quand ouvert ──
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  // ── Pas de rendu si fermé ──
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        {/* Icône */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <svg
            className={`h-6 w-6 ${variant === 'danger' ? 'text-red-600' : variant === 'warning' ? 'text-yellow-600' : 'text-blue-600'}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        {/* Titre */}
        <h2
          id="confirm-dialog-title"
          className="mb-2 text-lg font-semibold text-gray-900"
        >
          {title}
        </h2>

        {/* Message */}
        <p
          id="confirm-dialog-message"
          className="mb-6 text-sm leading-relaxed text-gray-600"
        >
          {message}
        </p>

        {/* Boutons */}
        <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-end">
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className={`flex h-11 min-h-[44px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${CONFIRM_BUTTON_CLASSES[variant]}`}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-11 min-h-[44px] items-center justify-center rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
