// ─── RdivExport – Indicateur de chargement ────────────────────────────────────
// Spinner animé simple avec message optionnel. Centré dans son conteneur parent.
// Utilise animate-spin de Tailwind CSS.

// ─── Types ──────────────────────────────────────────────────────────────────

interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

// ─── Classes de taille ───────────────────────────────────────────────────────

const SIZE_CLASSES = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
} as const

// ─── Composant ──────────────────────────────────────────────────────────────

export function LoadingSpinner({ message, size = 'md' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3" role="status">
      {/* Spinner */}
      <svg
        className={`animate-spin text-blue-600 ${SIZE_CLASSES[size]}`}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>

      {/* Message optionnel */}
      {message && (
        <p className="text-sm font-medium text-gray-500">{message}</p>
      )}

      {/* Accessibilité : lecteurs d'écran */}
      <span className="sr-only">Chargement en cours…</span>
    </div>
  )
}
