// --- RdivExport - Dashboard Centralisateur --------------------------------
// Voit toutes les réquisitions de toutes les pharmacies.

import { useEffect, useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { RequisitionCard } from '@/components/RequisitionCard'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { Requisition, Pharmacy } from '@/types'

export default function CentralisateurDashboard() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPharmacy, setSelectedPharmacy] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'pharmacy'>('list')

  const loadData = useCallback(async () => {
    setLoading(true)
    // Charger toutes les réquisitions avec pharmacy et items
    const { data: reqData } = await supabase
      .from('requisitions')
      .select('*, pharmacies(*), requisition_items(*)')
      .order('created_at', { ascending: false })

    if (reqData) {
      const mapped: Requisition[] = reqData.map((r: any) => ({
        ...r,
        items: r.requisition_items ?? [],
        pharmacy: r.pharmacies,
      }))
      setRequisitions(mapped)
    }

    // Charger les pharmacies
    const { data: phData } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (phData) setPharmacies(phData as Pharmacy[])

    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }, [loadData])

  // Filtrer
  let filtered = requisitions
  if (selectedPharmacy) {
    filtered = filtered.filter((r) => r.pharmacy_id === selectedPharmacy)
  }
  if (search.trim()) {
    const term = search.toLowerCase()
    filtered = filtered.filter((r) =>
      r.reference_number.toLowerCase().includes(term) ||
      (r.pharmacy?.name ?? '').toLowerCase().includes(term)
    )
  }

  // Stats
  const pendingCount = requisitions.filter((r) => r.status === 'pending').length
  const deliveredCount = requisitions.filter((r) => r.status === 'delivered').length
  const pharmacyReqCounts = pharmacies.map((ph) => ({
    pharmacy: ph,
    count: requisitions.filter((r) => r.pharmacy_id === ph.id).length,
    pending: requisitions.filter((r) => r.pharmacy_id === ph.id && r.status === 'pending').length,
  }))

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <LoadingSpinner size="lg" message="Chargement..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pb-4 pt-6 shadow-sm">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Centralisateur</p>
              <h1 className="text-xl font-bold text-gray-900">Toutes les réquisitions</h1>
            </div>
            <button onClick={handleRefresh}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500 transition-colors hover:bg-gray-100 ${refreshing ? 'animate-spin' : ''}`}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{requisitions.length}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-center">
              <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
              <p className="text-xs text-yellow-600">En attente</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{deliveredCount}</p>
              <p className="text-xs text-green-600">Livrées</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-4">
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
          /* Vue par pharmacie */
          <div className="space-y-2">
            {pharmacyReqCounts.map(({ pharmacy: ph, count, pending }) => (
              <button key={ph.id} onClick={() => { setSelectedPharmacy(ph.id); setViewMode('list') }}
                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-blue-300 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{ph.name}</p>
                    <p className="text-xs text-gray-500">{ph.phone ?? 'Pas de téléphone'}</p>
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
          /* Vue liste */
          <>
            {/* Filtres */}
            <div className="space-y-2">
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par réf ou pharmacie..."
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

            {/* Liste */}
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Aucune réquisition trouvée.</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((req) => (
                  <RequisitionCard key={req.id} requisition={req} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
