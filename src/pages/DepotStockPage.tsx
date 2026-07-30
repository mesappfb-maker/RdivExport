// ─── RdivExport – Page gestion du stock dépôt ──────────────────────────────
// Permet à l'utilisateur dépôt de consulter et publier les quantités de stock.

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { Product } from '@/types'

export default function DepotStockPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (data) setProducts(data as Product[])
    setLoading(false)
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
    setSaving(true)
    setSuccessMsg('')
    const updates = products.map(p => ({
      id: p.id,
      main_depot_stock: p.main_depot_stock,
    }))
    // Mise à jour par lots de 100
    for (let i = 0; i < updates.length; i += 100) {
      const batch = updates.slice(i, i + 100)
      await Promise.all(batch.map(u => 
        supabase.from('products').update({ main_depot_stock: u.main_depot_stock }).eq('id', u.id)
      ))
    }
    setSaving(false)
    setSuccessMsg('Stock publié avec succès !')
    setTimeout(() => setSuccessMsg(''), 3000)
  }, [products])

  const filtered = search
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <LoadingSpinner size="lg" message="Chargement du stock…" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-4 pb-4 pt-6 shadow-sm">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-xl font-bold text-gray-900">Stock du dépôt</h1>
          <p className="text-sm text-gray-500">Gérez et publiez votre inventaire</p>
          <div className="mt-4">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filtrer les produits…"
              className="block h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-2xl px-4 py-4">
        {successMsg && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-center">
            <p className="text-sm font-medium text-green-700">{successMsg}</p>
          </div>
        )}
        <p className="mb-3 text-xs text-gray-400">{filtered.length} produit{filtered.length !== 1 ? 's' : ''}</p>
        <div className="space-y-2">
          {filtered.map(product => (
            <div key={product.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
                {product.category && (
                  <p className="text-xs text-gray-400">{product.category}</p>
                )}
              </div>
              <input
                type="number"
                min={0}
                value={product.main_depot_stock || ''}
                onChange={e => handleStockChange(product.id, e.target.value)}
                inputMode="numeric"
                className="h-11 w-20 rounded-lg border border-gray-300 bg-gray-50 px-2 text-center text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ))}
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
  )
}
