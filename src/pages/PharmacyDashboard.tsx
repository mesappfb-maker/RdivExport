// --- RdivExport - Pharmacy Dashboard -----------------------------------------
// Tableau de bord pharmacie : stats, réquisitions, et stock visible du dépôt.

import { useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRequisitions } from '@/hooks/useRequisitions'
import { RequisitionCard } from '@/components/RequisitionCard'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/types'
import { formatQuantity } from '@/utils/formatters'

export default function PharmacyDashboard() {
  const navigate = useNavigate()
  const { state: authState } = useAuth()
  const profile = authState.profile
  const pharmacyId = profile?.pharmacy_id
  const pharmacyName = profile?.pharmacy?.name ?? 'Votre pharmacie'

  const { requisitions, loading, error, fetchRequisitions } = useRequisitions()
  const [refreshing, setRefreshing] = useState(false)

  // Stock dépôt
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [stockSearch, setStockSearch] = useState('')
  const [showAllStock, setShowAllStock] = useState(false)

  const loadData = useCallback(async () => {
    if (!pharmacyId) return
    await fetchRequisitions(pharmacyId)
  }, [pharmacyId, fetchRequisitions])

  const loadDepotStock = useCallback(async () => {
    setProductsLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (data) {
      setProducts(data as Product[])
    }
    setProductsLoading(false)
  }, [])

  useEffect(() => {
    loadData()
    loadDepotStock()
  }, [loadData, loadDepotStock])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([loadData(), loadDepotStock()])
    setRefreshing(false)
  }, [loadData, loadDepotStock])

  const allReqs = requisitions.data
  const pendingCount = allReqs.filter((r) => r.status === 'pending').length
  const deliveredCount = allReqs.filter((r) => r.status === 'delivered').length
  const totalItems = allReqs.reduce((sum, r) => sum + (r.items?.length ?? 0), 0)

  // Filtrer produits par recherche
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
    (p.code && p.code.toLowerCase().includes(stockSearch.toLowerCase())) ||
    (p.category && p.category.toLowerCase().includes(stockSearch.toLowerCase()))
  )
  const displayedProducts = showAllStock ? filteredProducts : filteredProducts.slice(0, 10)

  if (loading && !refreshing) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <LoadingSpinner size="lg" message="Chargement du tableau de bord..." />
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
            <button onClick={handleRefresh}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${refreshing ? 'animate-spin' : ''}`}
              aria-label="Actualiser">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
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

      <div className="mx-auto max-w-lg px-4 py-4 space-y-4">
        {/* Nouvelle réquisition */}
        <button onClick={() => navigate('/requisition/new')}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-base font-semibold text-white shadow-md shadow-blue-600/25 transition-all hover:bg-blue-700 hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nouvelle réquisition
        </button>

        {/* Stock du dépôt */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Stock dépôt
            </h2>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
              {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Recherche stock */}
          <div className="mb-3">
            <input type="text" value={stockSearch} onChange={(e) => setStockSearch(e.target.value)}
              placeholder="Rechercher un produit..."
              className="block h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {productsLoading ? (
            <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>
          ) : displayedProducts.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">Aucun produit trouvé.</p>
          ) : (
            <div className="space-y-1.5">
              {displayedProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                    {p.category && <p className="truncate text-[11px] text-gray-400">{p.category}</p>}
                  </div>
                  <div className="ml-3 text-right">
                    <p className={`text-sm font-semibold ${p.main_depot_stock > 0 ? 'text-gray-900' : 'text-red-600'}`}>
                      {formatQuantity(p.main_depot_stock)}
                    </p>
                    <p className="text-[11px] text-gray-400">{p.unit ?? 'unité'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredProducts.length > 10 && (
            <button onClick={() => setShowAllStock(!showAllStock)}
              className="mt-3 w-full rounded-lg border border-gray-200 bg-white py-2 text-xs font-medium text-blue-600 transition-colors hover:bg-gray-50">
              {showAllStock ? 'Voir moins' : `Voir tout (${filteredProducts.length} produits)`}
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Réquisitions récentes
        </h2>

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
