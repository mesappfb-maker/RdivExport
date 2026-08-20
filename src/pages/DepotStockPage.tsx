// ─── RdivExport – Page gestion du stock dépôt ──────────────────────────────
// Stats, alertes stock bas, produits les plus demandés, catégories.

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { KpiCard, StatSection, MiniBarChart, InsightCard } from '@/components/StatsCharts'
import { getDepotStats, type DepotStats } from '@/services/stats.service'
import type { Product } from '@/types'

export default function DepotStockPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState<DepotStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [showAlerts, setShowAlerts] = useState(false)

  useEffect(() => { loadProducts(); loadStats() }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('products').select('*').eq('is_active', true).order('name')
    if (data) setProducts(data as Product[])
    setLoading(false)
  }, [])

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try { setStats(await getDepotStats()) } catch { /* optional */ }
    setStatsLoading(false)
  }, [])

  const handleStockChange = useCallback((productId: string, value: string) => {
    const num = parseInt(value.replace(/\D/g, ''), 10)
    if (!isNaN(num) && num >= 0) {
      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, main_depot_stock: num } : p
      ))
    }
  }, [])

  const handlePublish = useCallback(async () => {
    setSaving(true); setSuccessMsg('')
    const updates = products.map(p => ({ id: p.id, main_depot_stock: p.main_depot_stock }))
    for (let i = 0; i < updates.length; i += 100) {
      const batch = updates.slice(i, i + 100)
      await Promise.all(batch.map(u =>
        supabase.from('products').update({ main_depot_stock: u.main_depot_stock }).eq('id', u.id)
      ))
    }
    setSaving(false)
    setSuccessMsg('Stock publie avec succes !')
    setTimeout(() => setSuccessMsg(''), 3000)
  }, [products])

  const filtered = search
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products

  // Most requested bar chart
  const mostRequestedData = stats?.mostRequested.slice(0, 6).map(p => ({
    label: p.productName.length > 20 ? p.productName.slice(0, 20) + '...' : p.productName,
    value: p.totalRequested,
  })) ?? []

  // Categories
  const categoryData = stats?.categories.slice(0, 6).map(c => ({
    label: c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name,
    value: c.count,
  })) ?? []

  // Stock health
  const inStockCount = products.filter(p => p.main_depot_stock > 0).length
  const stockHealthPct = products.length > 0 ? Math.round((inStockCount / products.length) * 100) : 100

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <LoadingSpinner size="lg" message="Chargement du stock..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-4 pb-4 pt-6 shadow-sm">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-xl font-bold text-gray-900">Stock du depot</h1>
          <p className="text-sm text-gray-500">Gerez et publiez votre inventaire</p>

          {/* KPIs */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <KpiCard
              label="Produits"
              value={stats?.totalProducts ?? products.length}
              color="blue"
              icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>}
            />
            <KpiCard
              label="Rupture"
              value={stats?.outOfStock ?? products.filter(p => p.main_depot_stock === 0).length}
              color={stats && stats.outOfStock > 0 ? 'red' : 'green'}
              icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>}
            />
            <KpiCard
              label="Sante stock"
              value={`${stockHealthPct}%`}
              color={stockHealthPct >= 80 ? 'green' : stockHealthPct >= 50 ? 'yellow' : 'red'}
              icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-4 space-y-4">
        {/* Alertes stock bas */}
        {stats && stats.lowStockProducts.length > 0 && (
          <StatSection
            title={`Alertes stock bas (${stats.lowStockProducts.length})`}
            subtitle="Produits sous le seuil minimum"
            action={
              <button onClick={() => setShowAlerts(!showAlerts)} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                {showAlerts ? 'Masquer' : 'Voir' }
              </button>
            }
          >
            {showAlerts ? (
              <div className="space-y-1.5">
                {stats.lowStockProducts.map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/50 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-[11px] text-red-500">Seuil : {p.threshold} {p.unit ?? 'unites'}</p>
                    </div>
                    <p className="ml-3 text-sm font-bold text-red-600">{p.stock} {p.unit ?? ''}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {stats.lowStockProducts.slice(0, 3).map(p => (
                  <InsightCard key={p.id} type="warning" title={p.name} description={`Stock actuel : ${p.stock} / Seuil : ${p.threshold} ${p.unit ?? 'unites'}`} />
                ))}
              </div>
            )}
          </StatSection>
        )}

        {/* Produits les plus demandes */}
        {!statsLoading && mostRequestedData.length > 0 && (
          <StatSection title="Produits les plus demandes" subtitle="Par quantite totale requise">
            <MiniBarChart data={mostRequestedData} height={24} />
          </StatSection>
        )}

        {/* Categories */}
        {!statsLoading && categoryData.length > 1 && (
          <StatSection title="Repartition par categorie" subtitle={`${stats?.categories.length ?? 0} categories`}>
            <MiniBarChart data={categoryData} height={22} />
          </StatSection>
        )}

        {/* Recherche + liste */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filtrer les produits..."
              className="block h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {successMsg && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-center">
              <p className="text-sm font-medium text-green-700">{successMsg}</p>
            </div>
          )}

          <p className="mb-3 text-xs text-gray-400">{filtered.length} produit{filtered.length !== 1 ? 's' : ''}</p>

          <div className="space-y-2">
            {filtered.map(product => {
              const isLow = stats?.lowStockProducts.some(lsp => lsp.id === product.id)
              return (
                <div key={product.id} className={`flex items-center gap-3 rounded-xl border p-3 shadow-sm ${isLow ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white'}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
                    {product.category && <p className="text-xs text-gray-400">{product.category}</p>}
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={product.main_depot_stock || ''}
                    onChange={e => handleStockChange(product.id, e.target.value)}
                    inputMode="numeric"
                    className={`h-11 w-20 rounded-lg border px-2 text-center text-sm font-medium focus:outline-none focus:ring-1 ${isLow ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-500' : 'border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-500 focus:ring-blue-500'}`}
                  />
                </div>
              )
            })}
          </div>

          <button
            onClick={handlePublish}
            disabled={saving}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <LoadingSpinner size="sm" /> : 'Publier le stock'}
          </button>
        </div>
      </div>
    </div>
  )
}