// --- RdivExport - Admin Dashboard --------------------------------------------
// Tableau de bord du requisitionniste principal : stats globales, filtres,
// liste de toutes les requisitions.

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRequisitions } from '@/hooks/useRequisitions'
import { getAllPharmacies } from '@/services/pharmacies.service'
import { RequisitionCard } from '@/components/RequisitionCard'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { RequisitionStatus, Pharmacy } from '@/types'
import type { RequisitionFilters } from '@/services/requisitions.service'

// --- Options de filtre statut -----------------------------------------------

const STATUS_FILTER_OPTIONS: Array<{ value: RequisitionStatus | ''; label: string }> = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'validated', label: 'Validee' },
  { value: 'delivered', label: 'Livree' },
  { value: 'cancelled', label: 'Annulee' },
]

// --- Composant ----------------------------------------------------------------

export default function AdminDashboard() {
  const navigate = useNavigate()

  const { requisitions, loading, error, fetchAllRequisitions } = useRequisitions()

  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [filters, setFilters] = useState<RequisitionFilters>({})
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // --- Chargement des pharmacies ---------------------------------------------
  useEffect(() => {
    getAllPharmacies().then((result) => {
      if (result.data) setPharmacies(result.data)
    })
  }, [])

  // --- Chargement des requisitions -------------------------------------------
  const loadRequisitions = useCallback(() => {
    const appliedFilters: RequisitionFilters = { ...filters }
    if (dateFrom) appliedFilters.dateFrom = dateFrom
    if (dateTo) appliedFilters.dateTo = dateTo
    fetchAllRequisitions(appliedFilters)
  }, [filters, dateFrom, dateTo, fetchAllRequisitions])

  useEffect(() => {
    loadRequisitions()
  }, [loadRequisitions])

  // --- Statistiques ----------------------------------------------------------
  const allReqs = requisitions.data
  const today = new Date().toISOString().slice(0, 10)
  const todayCount = allReqs.filter((r) => r.created_at.slice(0, 10) === today).length
  const pendingCount = allReqs.filter((r) => r.status === 'pending').length
  const validatedCount = allReqs.filter((r) => r.status === 'validated').length
  const deliveredCount = allReqs.filter((r) => r.status === 'delivered').length

  // --- Gestion des filtres ---------------------------------------------------
  const handlePharmacyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setFilters((prev) => ({
      ...prev,
      pharmacyId: val ? val : undefined,
    }))
  }, [])

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as RequisitionStatus | ''
    setFilters((prev) => ({
      ...prev,
      status: val ? val : undefined,
    }))
  }, [])

  // --- Loading ---------------------------------------------------------------
  if (loading && allReqs.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <LoadingSpinner size="lg" message="Chargement du tableau de bord..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tete */}
      <div className="bg-white px-4 pb-4 pt-6 shadow-sm">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-gray-500">Vue d'ensemble des requisitions</p>

          {/* Statistiques */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{todayCount}</p>
              <p className="mt-0.5 text-xs font-medium text-blue-600">Aujourd'hui</p>
            </div>
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-center">
              <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
              <p className="mt-0.5 text-xs font-medium text-yellow-600">En attente</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-center">
              <p className="text-2xl font-bold text-indigo-700">{validatedCount}</p>
              <p className="mt-0.5 text-xs font-medium text-indigo-600">Validees</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{deliveredCount}</p>
              <p className="mt-0.5 text-xs font-medium text-green-600">Livrees</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-4">
        {/* Barre de filtres */}
        <div className="mb-4 space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="pharmacy-filter" className="mb-1 block text-xs font-medium text-gray-500">
                Pharmacie
              </label>
              <select
                id="pharmacy-filter"
                value={filters.pharmacyId ?? ''}
                onChange={handlePharmacyChange}
                className="block h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Toutes les pharmacies</option>
                {pharmacies.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="status-filter" className="mb-1 block text-xs font-medium text-gray-500">
                Statut
              </label>
              <select
                id="status-filter"
                value={filters.status ?? ''}
                onChange={handleStatusChange}
                className="block h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="date-to" className="mb-1 block text-xs font-medium text-gray-500">
                Date limite
              </label>
              <input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="block h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
          <div>
            <label htmlFor="date-from" className="mb-1 block text-xs font-medium text-gray-500">
              Date debut
            </label>
            <input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="block h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Resultats */}
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {requisitions.total} requisition{requisitions.total !== 1 ? 's' : ''}
          </p>
        </div>

        {allReqs.length === 0 ? (
          <EmptyState
            title="Aucune requisition trouvee"
            description="Aucune requisation ne correspond a vos filtres."
          />
        ) : (
          <div className="space-y-3">
            {allReqs.map((req) => (
              <RequisitionCard key={req.id} requisition={req} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
