// ─── RdivExport – Bouton retour ──────────────────────────────────────────────
// Simple bouton de navigation arrière avec flèche gauche et texte « Retour ».
// Utilise useNavigate() de react-router-dom.

import { useNavigate } from 'react-router-dom'

// ─── Composant ──────────────────────────────────────────────────────────────

export function BackButton() {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="flex h-11 min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label="Retour"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
        />
      </svg>
      <span>Retour</span>
    </button>
  )
}
