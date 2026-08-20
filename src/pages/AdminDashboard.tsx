// --- RdivExport - Admin Dashboard --------------------------------------------
// Tableau de bord du superviseur : KPIs, graphiques, tendances,
// produits les plus demandés, performance par pharmacie, insights.

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRequisitions } from '@/hooks/useRequisitions'
import { getAllPharmacies } from '@/services/pharmacies.service'
import { getAdminStats, type AdminStats } from '@/services/stats.service'
import { RequisitionCard } from '@/components/RequisitionCard'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { KpiCard, StatSection, MiniBarChart, DonutChart, Sparkline, InsightCard } from '@/components/StatsCharts'
import type { RequisitionStatus, Pharmacy } from '@/types'
import type { RequisitionFilters } from '@/services/requisitions.service'

const STATUS_FILTER_OPTIONS: Array<{ value: RequisitionStatus | ''; label: string }> = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'consolidated' as RequisitionStatus, label: 'Consolidee' },
  { value: 'validated', label: 'Validee' },
  { value: 'delivered', label: 'Livree' },
  { value: 'cancelled', label: 'Annulee' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: '#eab308',
  consolidated: '#6366f1',
  validated: '#3b82f6',
  delivered: '#22c55e',
  cancelled: '#ef4444',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  consolidated: 'Consolidees',
  validated: 'Validees',
  delivered: 'Livreess',
  cancelled: 'Annulees',
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { requisitions, loading: reqLoading, error, fetchAllRequisitions } = useRequisitions()

  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [filters, setFilters] = useState<RequisitionFilters>({})
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [showStats, setShowStats] = useState(true)

  useEffect(() => {
    getAllPharmacies().then((result) => {
      if (result.data) setPharmacies(result.data)
    })
  }, [])

  // Charger les stats
  useEffect(() => {
    setStatsLoading(true)
    getAdminStats().then(s => {
      setStats(s)
      setStatsLoading(false)
    }).catch(() => setStatsLoading(false))
  }, [])

  const loadRequisitions = useCallback(() => {
    const appliedFilters: RequisitionFilters = { ...filters }
    if (dateFrom) appliedFilters.dateFrom = dateFrom
    if (dateTo) appliedFilters.dateTo = dateTo
    fetchAllRequisitions(appliedFilters)
  }, [filters, dateFrom, dateTo, fetchAllRequisitions])

  useEffect(() => { loadRequisitions() }, [loadRequisitions])

  const handlePharmacyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setFilters((prev) => ({ ...prev, pharmacyId: val ? val : undefined }))
  }, [])

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as RequisitionStatus | ''
    setFilters((prev) => ({ ...prev, status: val ? val : undefined }))
  }, [])

  const allReqs = requisitions.data

  if (reqLoading && allReqs.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <LoadingSpinner size="lg" message="Chargement du tableau de bord..." />
      </div>
    )
  }

  // Données pour les graphiques
  const statusSegments = stats
    ? Object.entries(stats.byStatus).map(([status, count]) => ({
        label: STATUS_LABELS[status] ?? status,
        value: count,
        color: STATUS_COLORS[status] ?? '#9ca3af',
      }))
    : []

  const pharmacyBarData = stats?.byPharmacy.slice(0, 6).map(p => ({
    label: p.pharmacyName.length > 18 ? p.pharmacyName.slice(0, 18) + '...' : p.pharmacyName,
    value: p.total,
  })) ?? []

  const topProductsData = stats?.topProducts.slice(0, 8).map(p => ({
    label: p.productName.length > 22 ? p.productName.slice(0, 22) + '...' : p.productName,
    value: p.totalQty,
  })) ?? []

  const weeklyValues = stats?.weeklyTrend.map(w => w.count) ?? []
  const weeklyLabels = stats?.weeklyTrend.map(w => {
    const d = new Date(w.week)
    return `${d.getDate()}/${d.getMonth() + 1}`
  }) ?? []

  const monthlyValues = stats?.monthlyTrend.map(m => m.count) ?? []
  const monthlyLabels = stats?.monthlyTrend.map(m => {
    const [, mo] = m.month.split('-')
    const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']
    return months[parseInt(mo) - 1]
  }) ?? []

  // Insights dynamiques
  const insights: Array<{ type: 'info' | 'warning' | 'success' | 'tip'; title: string; description: string; action?: { label: string; onClick: () => void } }> = []
  if (stats) {
    const pendingCount = stats.byStatus?.['pending'] ?? 0
    if (pendingCount > 5) {
      insights.push({ type: 'warning', title: `${pendingCount} requisitions en attente`, description: 'Un grand nombre de requisitions attendent traitement. Pensez à les consolider.', action: { label: 'Consolider', onClick: () => navigate('/admin/consolidation') } })
    } else if (pendingCount > 0) {
      insights.push({ type: 'info', title: `${pendingCount} requisition(s) en attente`, description: 'Des requisions attendent votre consolidation.', action: { label: 'Voir', onClick: () => navigate('/admin/consolidation') } })
    }
    if (stats.lowStockCount > 0) {
      insights.push({ type: 'warning', title: `${stats.lowStockCount} produit(s) en stock bas`, description: 'Certains produits ont atteint le seuil minimum. Alertez le depot.' })
    }
    if (stats.deliveryRate >= 80) {
      insights.push({ type: 'success', title: `Taux de livraison : ${stats.deliveryRate}%`, description: 'Bonne performance de livraison. Continuez ainsi !' })
    } else if (stats.deliveryRate > 0 && stats.deliveryRate < 50) {
      insights.push({ type: 'info', title: `Taux de livraison : ${stats.deliveryRate}%`, description: 'Le taux de livraison est faible. Identifiez les goulots d\'etranglement.' })
    }
    if (stats.weekRequisitions > 0 && stats.todayRequisitions === 0) {
      insights.push({ type: 'tip', title: 'Aucune requisition aujourd\'hui', description: 'Les pharmacies n\'ont pas encore envoye de requisitions. C\'est peut-etre normal.' })
    }
    if (insights.length === 0) {
      insights.push({ type: 'tip', title: 'Conseil', description: 'Consultez les tendances hebdomadaires pour anticiper les besoins.' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tete */}
      <div className="bg-white px-4 pb-4 pt-6 shadow-sm">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Tableau de bord</h1>
              <p className="text-sm text-gray-500">Vue d'ensemble et statistiques</p>
            </div>
            <button onClick={() => setShowStats(!showStats)}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100">
              <svg className={`h-4 w-4 transition-transform ${showStats ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
              {showStats ? 'Masquer stats' : 'Voir stats'}
            </button>
          </div>

          {/* KPI Cards */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Aujourd'hui"
              value={stats?.todayRequisitions ?? 0}
              color="blue"
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
            />
            <KpiCard
              label="En attente"
              value={stats?.byStatus?.['pending'] ?? 0}
              color="yellow"
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <KpiCard
              label="Taux livraison"
              value={`${stats?.deliveryRate ?? 0}%`}
              color="green"
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>}
            />
            <KpiCard
              label="Stock bas"
              value={stats?.lowStockCount ?? 0}
              color={stats && stats.lowStockCount > 0 ? 'red' : 'green'}
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>}
            />
          </div>

          {/* Lien vers statistiques avancées */}
          <button onClick={() => navigate('/admin/stats')}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
            Statistiques avancees et bonnes pratiques
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-4 space-y-4">
        {/* Section Statistiques */}
        {showStats && (
          <>
            {statsLoading ? (
              <div className="flex justify-center py-8"><LoadingSpinner size="sm" message="Chargement des statistiques..." /></div>
            ) : stats && (
              <>
                {/* Insights intelligents */}
                <div className="space-y-2">
                  {insights.map((insight, i) => (
                    <InsightCard key={i} {...insight} />
                  ))}
                </div>

                {/* Repartition par statut + Tendance */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <StatSection title="Repartition par statut" subtitle={`${stats.totalRequisitions} total`}>
                    <div className="flex justify-center py-2">
                      <DonutChart segments={statusSegments} centerValue={String(stats.totalRequisitions)} centerLabel="total" />
                    </div>
                  </StatSection>

                  <StatSection title="Tendance hebdomadaire" subtitle="8 dernieres semaines">
                    <Sparkline data={weeklyValues} labels={weeklyLabels} color="#3b82f6" showDots />
                  </StatSection>
                </div>

                {/* Tendance mensuelle */}
                <StatSection title="Tendance mensuelle" subtitle="6 derniers mois">
                  <Sparkline data={monthlyValues} labels={monthlyLabels} color="#6366f1" showDots height={50} />
                </StatSection>

                {/* Requisitions par pharmacie */}
                {pharmacyBarData.length > 0 && (
                  <StatSection title="Par pharmacie" subtitle={`${stats.activePharmacies} pharmacies actives`}>
                    <MiniBarChart data={pharmacyBarData} />
                  </StatSection>
                )}

                {/* Produits les plus demandes */}
                {topProductsData.length > 0 && (
                  <StatSection title="Produits les plus demandes" subtitle="Top 8 par quantite totale">
                    <MiniBarChart data={topProductsData} height={24} />
                  </StatSection>
                )}

                {/* Meta stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">{stats.activePharmacies}</p>
                    <p className="text-[11px] text-gray-500">Pharmacies</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">{stats.totalProducts}</p>
                    <p className="text-[11px] text-gray-500">Produits</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">{stats.avgItemsPerRequisition}</p>
                    <p className="text-[11px] text-gray-500">Articles/req</p>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Barre de filtres */}
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700">Filtrer les requisitions</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="pharmacy-filter" className="mb-1 block text-xs font-medium text-gray-500">Pharmacie</label>
              <select id="pharmacy-filter" value={filters.pharmacyId ?? ''} onChange={handlePharmacyChange}
                className="block h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                <option value="">Toutes</option>
                {pharmacies.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </div>
            <div>
              <label htmlFor="status-filter" className="mb-1 block text-xs font-medium text-gray-500">Statut</label>
              <select id="status-filter" value={filters.status ?? ''} onChange={handleStatusChange}
                className="block h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                {STATUS_FILTER_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
            </div>
            <div>
              <label htmlFor="date-to" className="mb-1 block text-xs font-medium text-gray-500">Date limite</label>
              <input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="block h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>
          <div>
            <label htmlFor="date-from" className="mb-1 block text-xs font-medium text-gray-500">Date debut</label>
            <input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="block h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-gray-400">{requisitions.total} requisition{requisitions.total !== 1 ? 's' : ''}</p>
        </div>

        {allReqs.length === 0 ? (
          <EmptyState title="Aucune requisition trouvee" description="Aucune requisation ne correspond a vos filtres." />
        ) : (
          <div className="space-y-3">{allReqs.map((req) => (<RequisitionCard key={req.id} requisition={req} />))}</div>
        )}
      </div>
    </div>
  )
}