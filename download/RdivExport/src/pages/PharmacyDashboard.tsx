// --- RdivExport - Pharmacy Dashboard -----------------------------------------
// Tableau de bord de l'utilisateur pharmacie : statistiques rapides,
// bouton de création et liste des réquisitions récentes.

import { useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRequisitions } from '@/hooks/useRequisitions'
import { RequisitionCard } from '@/components/RequisitionCard'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSpinner } from '@/components/LoadingSpinner'

// --- Composant ----------------------------------------------------------------

export default function PharmacyDashboard() {
  const navigate = useNavigate()
  const { state: authState } = useAuth()
  const profile = authState.profile
  const pharmacyId = profile?.pharmacy_id
  const pharmacyName = profile?.pharmacy?.name ?? 'Votre pharmacie'

  const { requisitions, loading, error, fetchRequisitions } = useRequisitions()
  const [refreshing, setRefreshing] = useState(false)

  // --- Chargement initial ----------------------------------------------------
  const loadData = useCallback(async () => {
    if (!pharmacyId) return
    await fetchRequisitions(pharmacyId)
  }, [pharmacyId, fetchRequisitions])

  useEffect(() => {
    loadData()
  }, [loadData])

  // --- Pull-to-refresh simulé -------------------------------------------------
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }, [loadData])

  // --- Statistiques calculées -------------------------------------------------
  const allReqs = requisitions.data
  const pendingCount = allReqs.filter((r) => r.status === 'pending').length
  const deliveredCount = allReqs.filter((r) => r.status === 'delivered').length
  const totalItems = allReqs.reduce(
    (sum, r) => sum + (r.items?.length ?? 0),
    0
  )

  // --- Loading ----------------------------------------------------------------
  if (loading && !refreshing) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <LoadingSpinner size="lg" message="Chargement du tableau de bord…" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <div className="bg-white px-4 pb-4 pt-6 shadow-sm">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Bienvenue,</p>
              <h1 className="text-xl font-bold text-gray-900">{profile?.full_name ?? 'Utilisateur'}</h1>
              <p className="mt-0.5 text-sm text-blue-600">{pharmacyName}</p>
            </div>
            <button
              onClick={handleRefresh}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${refreshing ? 'animate-spin' : ''}`}
              aria-label="Actualiser"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>

          {/* Statistiques rapides */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-center">
              <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
              <p className="mt-0.5 text-xs font-medium text-yellow-600">En attente</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{deliveredCount}</p>
              <p className="mt-0.5 text-xs font-medium text-green-600">Livrées</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{totalItems}</p>
              <p className="mt-0.5 text-xs font-medium text-blue-600">Articles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Bouton nouvelle réquisition */}
        <button
          onClick={() => navigate('/requisition/new')}
          className="mb-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-base font-semibold text-white shadow-md shadow-blue-600/25 transition-all hover:bg-blue-700 hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nouvelle réquisition
        </button>

        {/* Erreur */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Titre de la section */}
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Réquisitions récentes
        </h2>

        {/* Liste des réquisitions */}
        {allReqs.length === 0 ? (
          <EmptyState
            title="Aucune réquisition"
            description="Commencez par créer votre première réquisition de produits."
            actionLabel="Créer une réquisition"
            onAction={() => navigate('/requisition/new')}
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
