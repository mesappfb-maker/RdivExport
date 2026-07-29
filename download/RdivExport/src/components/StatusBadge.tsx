// ─── RdivExport – Badge de statut ────────────────────────────────────────────
// Affiche un badge coloré avec le libellé français du statut d'une réquisition.
// Utilise les constantes STATUS_COLORS et STATUS_LABELS.

import { STATUS_COLORS, STATUS_LABELS } from '@/utils/constants'
import type { RequisitionStatus } from '@/types'

// ─── Types ──────────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: RequisitionStatus
}

// ─── Composant ──────────────────────────────────────────────────────────────

export function StatusBadge({ status }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700 border-gray-300'
  const label = STATUS_LABELS[status] ?? status

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}
    >
      {label}
    </span>
  )
}
