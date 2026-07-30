// --- RdivExport - Requisition History Page -----------------------------------
// Historique des requisitions avec filtres par statut, y compris les brouillons.
// Les brouillons ont un lien direct pour reprendre l'édition.

import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRequisitions } from '@/hooks/useRequisitions'
import { RequisitionCard } from '@/components/RequisitionCard'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { formatDateShort } from '@/utils/formatters'
import type { RequisitionStatus } from '@/types'
import type { RequisitionFilters } from '@/services/requisitions.service'

const STATUS_TABS: Array<{ value: RequisitionStatus | 'draft' | ''; label: string }> = [
  { value: '', label: 'Toutes' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'pending', label: 'En attente' },
  { value: 'validated', label: 'Validees' },
  { value: 'delivered', label: 'Livrees' },
  { value: 'cancelled', label: 'Annulees' },
]

export default function RequisitionHistoryPage() {
  const { state: authState } = useAuth()
  const pharmacyId = authState.profile?.pharmacy_id
  const { requisitions, loading, error, fetchRequisitions } = useRequisitions()
  const [activeStatus, setActiveStatus] = useState<RequisitionStatus | 'draft' | ''>('')

  const loadData = useCallback(async () => {
    if (!pharmacyId) return
    const filters: RequisitionFilters = {}
    if (activeStatus) filters.status = activeStatus as RequisitionStatus
    await fetchRequisitions(pharmacyId, filters)
  }, [pharmacyId, activeStatus, fetchRequisitions])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleTabChange = useCallback((status: RequisitionStatus | 'draft' | '') => {
    setActiveStatus(status)
  }, [])

  if (loading && requisitions.data.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <LoadingSpinner size="lg" message="Chargement de l'historique..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-4 pb-4 pt-6 shadow-sm">
        <div className="mx-auto max-w-lg">
          <h1 className="text-xl font-bold text-gray-900">Historique</h1>
          <p className="text-sm text-gray-500">Vos requisitions passees</p>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  activeStatus === tab.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-lg px-4 py-4">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {requisitions.data.length === 0 ? (
          <EmptyState
            title="Aucune requisition"
            description={activeStatus === 'draft'
              ? "Vous n'avez pas de brouillon en cours. Creez une nouvelle requisition et enregistrez-la comme brouillon."
              : "Vous n'avez pas encore de requisition avec ce statut."
            }
          />
        ) : (
          <>
            <p className="mb-3 text-xs text-gray-400">
              {requisitions.total} requisition{requisitions.total !== 1 ? 's' : ''}
            </p>
            <div className="space-y-3">
              {requisitions.data.map((req) => (
                req.status === 'draft' ? (
                  <Link
                    key={req.id}
                    to={`/requisition/${req.id}`}
                    className="block rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md active:scale-[0.98]"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-gray-900">{req.reference_number}</p>
                        <p className="truncate text-xs text-gray-500">
                          Brouillon · {formatDateShort(req.created_at)}
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                        Brouillon
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {(req.items?.length ?? 0)} article{req.items?.length !== 1 ? 's' : ''}
                      </p>
                      <span className="text-xs font-semibold text-blue-600">
                        Reprendre →
                      </span>
                    </div>
                  </Link>
                ) : (
                  <RequisitionCard key={req.id} requisition={req} />
                )
              ))}
            </div>
            {requisitions.page < requisitions.totalPages && (
              <button
                onClick={loadData}
                disabled={loading}
                className="mt-4 flex h-11 w-full items-center justify-center rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-60"
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Recharger'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}