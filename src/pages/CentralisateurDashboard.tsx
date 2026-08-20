// --- RdivExport - Dashboard Centralisateur --------------------------------
// Vue complete avec KPIs, performance, tendances, et stats par pharmacie.

import { useEffect, useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { RequisitionCard } from '@/components/RequisitionCard'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { KpiCard, StatSection, Sparkline, MiniBarChart, InsightCard, ProgressRing } from '@/components/StatsCharts'
import { getCentralisateurStats, type CentralisateurStats } from '@/services/stats.service'
import type { Requisition, Pharmacy } from '@/types'

export default function CentralisateurDashboard() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPharmacy, setSelectedPharmacy] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'pharmacy'>('list')
  const [stats, setStats] = useState<CentralisateurStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: reqData } = await supabase
      .from('requisitions')
      .select('*, pharmacies(*), requisition_items(*)')
      .order('created_at', { ascending: false })

    if (reqData) {
      const mapped: Requisition[] = reqData.map((r: any) => ({
        ...r, items: r.requisition_items ?? [], pharmacy: r.pharmacies,
      }))
      setRequisitions(mapped)
    }

    const { data: phData } = await supabase
      .from('pharmacies').select('*').eq('is_active', true).order('name')
    if (phData) setPharmacies(phData as Pharmacy[])

    setLoading(false)
  }, [])

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try { setStats(await getCentralisateurStats()) } catch { /* optional */ }
    setStatsLoading(false)
  }, [])

  useEffect(() => { loadData(); loadStats() }, [loadData, loadStats])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([loadData(), loadStats()])
    setRefreshing(false)
  }, [loadData, loadStats])

  let filtered = requisitions
  if (selectedPharmacy) filtered = filtered.filter((r) => r.pharmacy_id === selectedPharmacy)
  if (search.trim()) {
    const term = search.toLowerCase()
    filtered = filtered.filter((r) =>
      r.reference_number.toLowerCase().includes(term) ||
      (r.pharmacy?.name ?? '').toLowerCase().includes(term)
    )
  }

  // Tendance hebdomadaire
  const weeklyValues = stats?.weeklyTrend.map(w => w.count) ?? []
  const weeklyLabels = stats?.weeklyTrend.map(w => {
    const d = new Date(w.week)
    return `${d.getDate()}/${d.getMonth() + 1}`
  }) ?? []

  // Par pharmacie
  const pharmacyBarData = stats?.byPharmacy.slice(0, 6).map(p => ({
    label: p.pharmacyName.length > 18 ? p.pharmacyName.slice(0, 18) + '...' : p.pharmacyName,
    value: p.total,
  })) ?? []

  const pharmacyReqCounts = pharmacies.map((ph) => ({
    pharmacy: ph,
    count: requisitions.filter((r) => r.pharmacy_id === ph.id).length,
    pending: requisitions.filter((r) => r.pharmacy_id === ph.id && r.status === 'pending').length,
  }))

  // Insights
  const insights: Array<{ type: 'info' | 'warning' | 'success' | 'tip'; title: string; description: string }> = []
  if (stats) {
    if (stats.pendingCount > 3) {
      insights.push({ type: 'warning', title: `${stats.pendingCount} requisitions a traiter`, description: 'Plusieurs requisitions attendent votre consolidation.' })
    }
    if (stats.avgProcessingDays > 0) {
      insights.push({ type: 'info', title: `Delai moyen : ${stats.avgProcessingDays} jours`, description: 'Du depot a la livraison.' })
    }
    if (stats.pendingCount === 0 && stats.totalRequisitions > 0) {
      insights.push({ type: 'success', title: 'Tout est a jour !', description: 'Aucune requisition en attente. Bon travail !' })
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <LoadingSpinner size="lg" message="Chargement..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-4 pb-4 pt-6 shadow-sm">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Centralisateur</p>
              <h1 className="text-xl font-bold text-gray-900">Tableau de bord</h1>
            </div>
            <button onClick={handleRefresh}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500 transition-colors hover:bg-gray-100 ${refreshing ? 'animate-spin' : ''}`}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>

          {/* KPI Cards */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Total"
              value={stats?.totalRequisitions ?? requisitions.length}
              color="blue"
              icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}
            />
            <KpiCard
              label="En attente"
              value={stats?.pendingCount ?? 0}
              color="yellow"
              icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <KpiCard
              label="Livreess"
              value={stats?.deliveredCount ?? 0}
              color="green"
              icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <KpiCard
              label="Delai moy."
              value={`${stats?.avgProcessingDays ?? 0}j`}
              color="purple"
              icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-4">
        {/* Insights */}
        {!statsLoading && insights.length > 0 && (
          <div className="space-y-2">{insights.map((ins, i) => <InsightCard key={i} {...ins} />)}</div>
        )}

        {/* Tendance */
        {!statsLoading && weeklyValues.length > 0 && (
          <StatSection title="Tendance hebdomadaire" subtitle="8 dernieres semaines">
            <Sparkline data={weeklyValues} labels={weeklyLabels} color="#6366f1" showDots />
          </StatSection>
        )}

        {/* Par pharmacie */
        {!statsLoading && pharmacyBarData.length > 0 && (
          <StatSection title="Requisitions par pharmacie" subtitle={`${pharmacies.length} pharmacies` }>
            <MiniBarChart data={pharmacyBarData} />
          </StatSection>
        )}

        {/* Toggle vue */}
        <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-1">
          <button onClick={() => setViewMode('list')}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            Liste
          </button>
          <button onClick={() => setViewMode('pharmacy')}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${viewMode === 'pharmacy' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            Par pharmacie
          </button>
        </div>

        {viewMode === 'pharmacy' ? (
          <div className="space-y-2">
            {pharmacyReqCounts.map(({ pharmacy: ph, count, pending }) => (
              <button key={ph.id} onClick={() => { setSelectedPharmacy(ph.id); setViewMode('list') }}
                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-blue-300 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{ph.name}</p>
                    <p className="text-xs text-gray-500">{ph.phone ?? 'Pas de telephone'}</p>
                    {ph.whatsapp_number && <p className="text-xs text-green-600">WhatsApp: {ph.whatsapp_number}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{count}</p>
                    {pending > 0 && <p className="text-[11px] text-yellow-600">{pending} en attente</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par ref ou pharmacie..."
                className="block h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button onClick={() => setSelectedPharmacy(null)}
                  className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${!selectedPharmacy ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  Toutes
                </button>
                {pharmacies.map((ph) => (
                  <button key={ph.id} onClick={() => setSelectedPharmacy(ph.id)}
                    className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${selectedPharmacy === ph.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {ph.name}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Aucune requisition trouvee.</p>
            ) : (
              <div className="space-y-3">{filtered.map((req) => (<RequisitionCard key={req.id} requisition={req} />))}</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}