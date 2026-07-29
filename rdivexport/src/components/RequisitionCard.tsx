// ─── RdivExport – Carte de réquisition ────────────────────────────────────────
// Carte récapitulative pour les vues en liste. Affiche la référence, le nom de
// la pharmacie, la date formatée, le badge de statut et le nombre d'articles.
// Cliquable via Link pour naviguer vers le détail.

import { Link } from 'react-router-dom'
import { formatDateShort } from '@/utils/formatters'
import { StatusBadge } from '@/components/StatusBadge'
import type { Requisition } from '@/types'

// ─── Types ──────────────────────────────────────────────────────────────────

interface RequisitionCardProps {
  requisition: Requisition
}

// ─── Composant ──────────────────────────────────────────────────────────────

export function RequisitionCard({ requisition }: RequisitionCardProps) {
  const {
    id,
    reference_number,
    pharmacy,
    status,
    items,
    created_at,
  } = requisition

  const pharmacyName = pharmacy?.name ?? 'Pharmacie inconnue'
  const itemCount = items?.length ?? 0
  const totalQuantity = items?.reduce((sum, item) => sum + item.quantity_requested, 0) ?? 0

  return (
    <Link
      to={`/requisition/${id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      {/* En-tête : référence + statut */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-gray-900">
            {reference_number}
          </p>
          <p className="truncate text-sm text-gray-600">
            {pharmacyName}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Détails : date + articles */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <span>{formatDateShort(created_at)}</span>
        </div>
        <div className="flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <span>
            {itemCount} article{itemCount !== 1 ? 's' : ''} · {totalQuantity} unité{totalQuantity !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </Link>
  )
}
