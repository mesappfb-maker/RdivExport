// --- RdivExport - Delivery List Page ------------------------------------------
// Liste des requisitions prêtes à livrer (statut pending ou validated).
// Le centralisateur/dépôt choisit une réquisition pour accéder au bordereau.

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRequisitions } from '@/hooks/useRequisitions'
import { StatusBadge } from '@/components/StatusBadge'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { formatDateShort, formatQuantity } from '@/utils/formatters'
import type { RequisitionStatus } from '@/types'
import type { RequisitionFilters } from '@/services/requisitions.service'

const DELIVERY_STATUS_OPTIONS: Array<{ value: RequisitionStatus | ''; label: string }> = [
  { value: '', label: 'A livrer' },
  { value: 'pending', label: 'En attente' },
  { value: 'validated', label: 'Validées' },
  { value: 'delivered', label: 'Déjà livrées' },
]

export default function DeliveryListPage() {
  const navigate = useNavigate()
  const { requisitions, loading, error, fetchAllRequisitions } = useRequisitions()
  const [statusFilter, setStatusFilter] = useState<RequisitionStatus | ''>('')

  const loadData = useCallback(async () => {
    const filters: RequisitionFilters = {}
    if (statusFilter) {
      filters.status = statusFilter
    } else {
      // Par défaut, montrer pending + validated
      // On charge tout et on filtre côté client
    }
    await fetchAllRequisitions(filters)
  }, [statusFilter, fetchAllRequisitions])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtrer pour ne montrer que ce qui peut être livré
  const deliverableReqs = statusFilter
    ? requisitions.data
    : requisitions.data.filter(
        (r) => r.status === 'pending' || r.status === 'validated'
      )

  if (loading && deliverableReqs.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <LoadingSpinner size="lg" message="Chargement des livraisons..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-4 pb-4 pt-6 shadow-sm">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-xl font-bold text-gray-900">Livraisons</h1>
          <p className="text-sm text-gray-500">Gestion des bordereaux de livraison</p>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            {DELIVERY_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-4">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {deliverableReqs.length === 0 ? (
          <EmptyState
            title="Aucune livraison"
            description="Aucune réquisition en attente de livraison."
          />
        ) : (
          <div className="space-y-3">
            {deliverableReqs.map((req) => {
              const itemCount = req.items?.length ?? 0
              const totalQty = req.items?.reduce((s, i) => s + i.quantity_requested, 0) ?? 0
              const isDelivered = req.status === 'delivered'

              return (
                <button
                  key={req.id}
                  onClick={() => navigate(`/admin/delivery/${req.id}`)}
                  disabled={isDelivered}
                  className={`block w-full rounded-xl border bg-white p-4 text-left shadow-sm transition-all ${
                    isDelivered
                      ? 'border-gray-200 opacity-60 cursor-not-allowed'
                      : 'border-gray-200 hover:border-blue-200 hover:shadow-md active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-gray-900">
                        {req.reference_number}
                      </p>
                      <p className="truncate text-sm text-gray-600">
                        {req.pharmacy?.name ?? 'Pharmacie inconnue'}
                      </p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span>{formatDateShort(req.created_at)}</span>
                    <span>{itemCount} article{itemCount !== 1 ? 's' : ''}</span>
                    <span>{formatQuantity(totalQty)} unité{totalQty !== 1 ? 's' : ''}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
