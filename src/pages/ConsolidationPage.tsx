// --- RdivExport - Consolidation Page -----------------------------------------
// Vue consolidee des demandes par produit a travers toutes les pharmacies.

import { useEffect, useState, useCallback } from 'react'
import { getConsolidatedRequisitions } from '@/services/requisitions.service'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EmptyState } from '@/components/EmptyState'
import { formatQuantity } from '@/utils/formatters'
import type { ConsolidatedProduct } from '@/services/requisitions.service'
import type { RequisitionStatus } from '@/types'
import type { Pharmacy } from '@/types'

const STATUS_OPTIONS: Array<{ value: RequisitionStatus | ''; label: string }> = [
  { value: '', label: 'Tous' },
  { value: 'pending', label: 'En attente' },
  { value: 'validated', label: 'Validee' },
  { value: 'delivered', label: 'Livree' },
]

export default function ConsolidationPage() {
  const [products, setProducts] = useState<ConsolidatedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<RequisitionStatus | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [pharmacyFilter, setPharmacyFilter] = useState('')

  // Charger les pharmacies pour le filtre
  useEffect(() => {
    supabase.from('pharmacies').select('id, name, code').order('name').then(({ data }) => {
      if (data) setPharmacies(data as Pharmacy[])
    })
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const filters: { status?: RequisitionStatus; dateFrom?: string; pharmacyId?: string } = {}
    if (statusFilter) filters.status = statusFilter
    if (dateFrom) filters.dateFrom = dateFrom
    if (pharmacyFilter) filters.pharmacyId = pharmacyFilter
    const result = await getConsolidatedRequisitions(filters)
    if (result.error) {
      setError(result.error)
      setProducts([])
    } else {
      setProducts(result.data)
    }
    setLoading(false)
  }, [statusFilter, dateFrom, pharmacyFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const toggleExpand = useCallback((productId: string) => {
    setExpandedId((prev) => (prev === productId ? null : productId))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <LoadingSpinner size="lg" message="Chargement de la consolidation..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-4 pb-4 pt-6 shadow-sm">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-xl font-bold text-gray-900">Consolidation</h1>
          <p className="text-sm text-gray-500">Vue globale des demandes par produit</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="consol-status" className="mb-1 block text-xs font-medium text-gray-500">Statut</label>
              <select
                id="consol-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RequisitionStatus | '')}
                className="block h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="consol-date" className="mb-1 block text-xs font-medium text-gray-500">Depuis le</label>
              <input
                id="consol-date"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="block h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-2xl px-4 py-4">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {products.length === 0 ? (
          <EmptyState
            title="Aucune donnee"
            description="Aucune requisation en cours a consolider."
          />
        ) : (
          <div className="space-y-3">
            {products.map((product) => {
              const isExpanded = expandedId === product.product_id
              return (
                <div key={product.product_id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleExpand(product.product_id)}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{product.product_name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {product.pharmacy_count} pharmacie{product.pharmacy_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span className="text-sm font-bold text-blue-700">{formatQuantity(product.total_requested)}</span>
                      {product.total_delivered > 0 && (
                        <span className="text-xs text-green-600">L: {formatQuantity(product.total_delivered)}</span>
                      )}
                      <svg className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/50">
                      <div className="divide-y divide-gray-100">
                        {product.pharmacies.map((ph) => (
                          <div key={ph.requisition_id} className="flex items-center justify-between px-4 py-2.5">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-gray-800">{ph.pharmacy_name}</p>
                              <p className="text-xs text-gray-400">{ph.requisition_ref}</p>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{formatQuantity(ph.quantity_requested)}</p>
                                <p className="text-xs text-gray-400">demande</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-green-700">{formatQuantity(ph.quantity_delivered)}</p>
                                <p className="text-xs text-gray-400">livre</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
