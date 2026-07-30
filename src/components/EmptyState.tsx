// ─── RdivExport – État vide ─────────────────────────────────────────────────
// Composant d'espace réservé affiché lorsqu'une liste est vide ou qu'une
// action n'a pas encore de données. Centré avec icône, titre, description
// et bouton d'action optionnel.

import type { ReactNode } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

// ─── Icône par défaut ──────────────────────────────────────────────────────

function DefaultIcon() {
  return (
    <svg
      className="h-16 w-16 text-gray-300"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25-2.25M12 13.875V7.5m0 0l-2.25 2.25M12 7.5l2.25-2.25m-7.5 0h15c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H4.125c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  )
}

// ─── Composant ──────────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      {/* Icône */}
      <div className="mb-4 flex h-24 w-24 items-center justify-center">
        {icon ?? <DefaultIcon />}
      </div>

      {/* Titre */}
      <h3 className="mb-1 text-lg font-semibold text-gray-900">
        {title}
      </h3>

      {/* Description */}
      <p className="mb-6 max-w-xs text-sm leading-relaxed text-gray-500">
        {description}
      </p>

      {/* Bouton d'action optionnel */}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex h-11 min-h-[44px] items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
