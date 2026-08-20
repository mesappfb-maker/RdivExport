// --- RdivExport - Pharmacy Dashboard -----------------------------------------
// Tableau de bord pharmacie : KPIs, stats, tendances, suggestions intelligentes,
// produits frequents, et stock visible du depot.

import { useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRequisitions } from '@/hooks/useRequisitions'
import { RequisitionCard } from '@/components/RequisitionCard'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { KpiCard, StatSection, Sparkline, MiniBarChart, InsightCard, SuggestionChip } from '@/components/StatsCharts'
import { getPharmacyStats, type PharmacyStats } from '@/services/stats.service'
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

  // Stats
  const [stats, setStats] = useState<PharmacyStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Stock depot
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [stockSearch, setStockSearch] = useState('')
  const [showAllStock, setShowAllStock] = useState(false)

  const loadData = useCallback(async () => {
    if (!pharmacyId) return
    await fetchRequisitions(pharmacyId)
  }, [pharmacyId, fetchRequisitions])

  const loadStats = useCallback(async () => {
    if (!pharmacyId) return
    setStatsLoading(true)
    try {
      const s = await getPharmacyStats(pharmacyId as any)
      setStats(s)
    } catch { /* stats are optional */ }
    setStatsLoading(false)
  }, [pharmacyId])

  const loadDepotStock = useCallback(async () => {
    setProductsLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (data) setProducts(data as Product[])
    setProductsLoading(false)
  }, [])

  useEffect(() => {
    loadData()
    loadStats()
    loadDepotStock()
  }, [loadData, loadStats, loadDepotStock])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([loadData(), loadStats(), loadDepotStock()])
    setRefreshing(false)
  }, [loadData, loadStats, loadDepotStock])

  const allReqs = requisitions.data

  // Filtrer produits par recherche
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
    (p.code && p.code.toLowerCase().includes(stockSearch.toLowerCase())) ||
    (p.category && p.category.toLowerCase().includes(stockSearch.toLowerCase()))
  )
  const displayedProducts = showAllStock ? filteredProducts : filteredProducts.slice(0, 8)

  // Graphique mensuel
  const monthlyValues = stats?.monthlyTrend.map(m => m.count) ?? []
  const monthlyLabels = stats?.monthlyTrend.map(m => {
    const [, mo] = m.month.split('-')
    const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']
    return months[parseInt(mo) - 1]
  }) ?? []

  // Top produits barres
  const topBarData = stats?.topProducts.slice(0, 5).map(p => ({
    label: p.productName.length > 20 ? p.productName.slice(0, 20) + '...' : p.productName,
    value: p.totalQty,
  })) ?? []

  // Produits stock bas du depot (pertinents pour la pharmacie)
  const lowStockProducts = products.filter(p => p.main_depot_stock === 0).slice(0, 3)

  // Suggestions : produits frequents
  const frequentProducts = stats?.frequentProducts ?? []

  // Insights dynamiques
  const insights: Array<{ type: 'info' | 'warning' | 'success' | 'tip'; title: string; description: string; action?: { label: string; onClick: () => void } }> = []
  if (stats) {
    if (stats.pendingCount > 0) {
      insights.push({ type: 'warning', title: `${stats.pendingCount} requisition(s) en attente`, description: 'Vos requisitions sont en cours de traitement par le centralisateur.' })
    }
    if (stats.draftCount > 0) {
      insights.push({
        type: 'info', title: `${stats.draftCount} brouillon(s) en cours`,
        description: 'Vous avez des brouillons non envoyes.',
        action: { label: 'Voir mes brouillons', onClick: () => navigate('/historique') },
      })
    }
    if (stats.lastRequisitionDate) {
      const daysSince = Math.floor((Date.now() - new Date(stats.lastRequisitionDate).getTime()) / 86400000)
      if (daysSince > 14) {
        insights.push({
          type: 'tip', title: 'Derniere requision il y a ' + daysSince + ' jours',
          description: 'Il est recommande de passer des requisitions regulierement pour maintenir le stock.',
          action: { label: 'Creer une requisition', onClick: () => navigate('/requisition/new') },
        })
      }
    }
    if (lowStockProducts.length > 0) {
      insights.push({ type: 'warning', title: `${lowStockProducts.length} produit(s) en rupture au depot`, description: lowStockProducts.map(p => p.name).join(', ') })
    }
  }

  if (loading && !refreshing) {
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

          {/* KPI Cards */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <KpiCard
              label="En attente"
              value={stats?.pendingCount ?? allReqs.filter(r => r.status === 'pending').length}
              color="yellow"
              icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <KpiCard
              label="Livreess"
              value={stats?.deliveredCount ?? allReqs.filter(r => r.status === 'delivered').length}
              color="green"
              icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <KpiCard
              label="Total req."
              value={stats?.totalRequisitions ?? 0}
              color="indigo"
              icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-4">
        {/* Bouton nouvelle requisition */}
        <button onClick={() => navigate('/requisition/new')}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-base font-semibold text-white shadow-md shadow-blue-600/25 transition-all hover:bg-blue-700 hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nouvelle requisition
        </button>

        {/* Insights intelligents */}
        {insights.length > 0 && (
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <InsightCard key={i} {...insight} />
            ))}
          </div>
        )}

        {/* Suggestions produits frequents */}
        {frequentProducts.length > 0 && (
          <StatSection title="Suggestions rapides" subtitle="Basees sur vos commandes precedentes">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {frequentProducts.slice(0, 6).map((p) => (
                <SuggestionChip
                  key={p.productId}
                  name={p.productName}
                  frequency={p.count}
                  avgQty={Math.round(p.totalQty / p.count)}
                  onClick={() => navigate('/requisition/new')}
                />
              ))}
            </div>
          </StatSection>
        )}

        {/* Tendance mensuelle */}
        {stats && monthlyValues.length > 0 && (
          <StatSection title="Vos requisitions par mois" subtitle="6 derniers mois">
            <Sparkline data={monthlyValues} labels={monthlyLabels} color="#6366f1" showDots />
          </StatSection>
        )}

        {/* Top produits */}
        {topBarData.length > 0 && (
          <StatSection title="Vos produits les plus commandes" subtitle="Par quantite totale">
            <MiniBarChart data={topBarData} height={24} />
          </StatSection>
        )}

        {/* Stock du depot */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Stock depot</h2>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
              {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="mb-3">
            <input type="text" value={stockSearch} onChange={(e) => setStockSearch(e.target.value)}
              placeholder="Rechercher un produit..."
              className="block h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>

          {productsLoading ? (
            <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>
          ) : displayedProducts.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">Aucun produit trouve.</p>
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
                    <p className="text-[11px] text-gray-400">{p.unit ?? 'unite'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredProducts.length > 8 && (
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
          Requisitions recentes
        </h2>

        {allReqs.length === 0 ? (
          <EmptyState
            title="Aucune requisition"
            description="Commencez par creer votre premiere requisition de produits."
            actionLabel="Creer une requisition"
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