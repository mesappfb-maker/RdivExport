// --- RdivExport - Depot Products Page ----------------------------------------
// Gestion des produits par le dépôt : liste, ajout manuel, import Excel.

import { useState, useCallback, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { Product } from '@/types'

export default function DepotProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Ajout manuel
  const [addName, setAddName] = useState('')
  const [addUnit, setAddUnit] = useState('')
  const [addCategory, setAddCategory] = useState('')
  const [addStock, setAddStock] = useState('0')
  const [adding, setAdding] = useState(false)

  // Import
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

  // Édition stock inline
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStock, setEditStock] = useState('')

  const flash = useCallback((type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name')
    if (data) {
      setProducts(data.map((r: any) => ({
        id: r.id, name: r.name,
        description: r.description ?? undefined,
        code: r.code ?? undefined,
        main_depot_stock: r.main_depot_stock ?? 0,
        unit: r.unit ?? undefined,
        category: r.category ?? undefined,
        min_stock_threshold: r.min_stock_threshold ?? 0,
        is_active: r.is_active !== false,
        created_at: r.created_at, updated_at: r.updated_at,
      })))
    }
    if (error) flash('error', 'Erreur chargement: ' + error.message)
    setLoading(false)
  }, [flash])

  useEffect(() => { loadProducts() }, [loadProducts])

  // --- Ajouter un produit ---
  const handleAdd = useCallback(async () => {
    if (!addName.trim()) return
    setAdding(true)
    const { error } = await supabase.from('products').insert({
      name: addName.trim(),
      unit: addUnit.trim() || null,
      category: addCategory.trim() || null,
      main_depot_stock: parseInt(addStock, 10) || 0,
    })
    if (error) {
      flash('error', 'Erreur: ' + error.message)
    } else {
      flash('success', `Produit "${addName.trim()}" ajouté.`)
      setAddName(''); setAddUnit(''); setAddCategory(''); setAddStock('0')
      loadProducts()
    }
    setAdding(false)
  }, [addName, addUnit, addCategory, addStock, flash, loadProducts])

  // --- Modifier le stock inline ---
  const handleSaveStock = useCallback(async (productId: string) => {
    const val = parseInt(editStock, 10)
    if (isNaN(val)) return
    const { error } = await supabase
      .from('products')
      .update({ main_depot_stock: val, updated_at: new Date().toISOString() })
      .eq('id', productId)
    if (error) {
      flash('error', 'Erreur: ' + error.message)
    } else {
      setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, main_depot_stock: val } : p))
    }
    setEditingId(null)
  }, [editStock, flash])

  // --- Import Excel ---
  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

      if (rows.length === 0) {
        flash('error', 'Le fichier est vide.')
        setImporting(false)
        return
      }

      // Trouver les colonnes
      const headers = Object.keys(rows[0]).map((h) => h.toLowerCase().trim())
      const findCol = (candidates: string[]) => {
        for (const c of candidates) {
          const idx = headers.indexOf(c)
          if (idx >= 0) return Object.keys(rows[0])[idx]
        }
        return null
      }

      const nameCol = findCol(['name', 'nom', 'produit', 'product', 'désignation', 'designation'])
      const unitCol = findCol(['unit', 'unité', 'unite'])
      const stockCol = findCol(['stock', 'quantité', 'quantity', 'qté', 'qte', 'main_depot_stock'])
      const catCol = findCol(['category', 'catégorie', 'categorie', 'catégorie'])

      if (!nameCol) {
        flash('error', 'Colonne "nom" ou "name" introuvable dans le fichier.')
        setImporting(false)
        return
      }

      // Récupérer tous les produits existants
      const { data: existingProducts } = await supabase
        .from('products')
        .select('id, name')

      const nameToId = new Map<string, string>()
      if (existingProducts) {
        for (const p of existingProducts) {
          nameToId.set((p.name as string).toLowerCase().trim(), p.id as string)
        }
      }

      let created = 0
      let updated = 0
      let skipped = 0

      for (const row of rows) {
        const name = String(row[nameCol] ?? '').trim()
        if (!name) { skipped++; continue }

        const unit = unitCol ? String(row[unitCol] ?? '').trim() || null : null
        const stock = stockCol ? parseInt(String(row[stockCol] ?? '0'), 10) || 0 : 0
        const category = catCol ? String(row[catCol] ?? '').trim() || null : null

        const existingId = nameToId.get(name.toLowerCase())

        if (existingId) {
          // Mettre à jour
          const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
          if (stock > 0) updates.main_depot_stock = stock
          if (unit) updates.unit = unit
          if (category) updates.category = category

          const { error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', existingId)

          if (!error) updated++
          else skipped++
        } else {
          // Créer
          const { error } = await supabase.from('products').insert({
            name, unit, main_depot_stock: stock, category,
          })
          if (!error) {
            created++
            nameToId.set(name.toLowerCase(), 'new-' + created) // éviter les doublons dans le même import
          } else {
            skipped++
          }
        }
      }

      setImportResult(`${created} créé(s), ${updated} mis à jour, ${skipped} ignoré(s) sur ${rows.length} lignes`)
      flash('success', `Import terminé : ${created} créé(s), ${updated} mis à jour.`)
      loadProducts()
    } catch (err) {
      flash('error', 'Erreur lecture fichier: ' + (err instanceof Error ? err.message : 'Inconnue'))
    }

    setImporting(false)
    // Reset input
    e.target.value = ''
  }, [flash, loadProducts])

  // Filtrage
  const filtered = search.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div />
          <h1 className="text-lg font-bold text-gray-900">Produits du dépôt</h1>
          <div className="w-16" />
        </div>
      </div>

      {/* Flash */}
      {msg && (
        <div className="mx-auto max-w-lg px-4 pt-4">
          <div className={`rounded-xl border p-3 text-sm font-medium ${
            msg.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
          }`}>{msg.text}</div>
        </div>
      )}

      <div className="mx-auto max-w-lg px-4 py-4 space-y-4">
        {/* Recherche */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="block w-full rounded-xl border border-gray-300 bg-white px-3 h-11 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <p className="mt-2 text-xs text-gray-500">{filtered.length} produit{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Import Excel */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-base font-semibold text-gray-900">Import Excel</h2>
          <p className="mb-3 text-xs text-gray-500">
            Fichier .xlsx, .xls ou .csv. Colonnes attendues : nom/name, unit/unité, stock/quantité, catégorie.
          </p>
          <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100">
            {importing ? <LoadingSpinner size="sm" /> : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Choisir un fichier
              </>
            )}
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" disabled={importing} />
          </label>
          {importResult && <p className="mt-2 text-xs text-green-600 font-medium">{importResult}</p>}
        </div>

        {/* Ajout manuel */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-base font-semibold text-gray-900">Ajouter un produit</h2>
          <div className="space-y-2">
            <input type="text" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Nom du produit *"
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 h-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <div className="grid grid-cols-3 gap-2">
              <input type="text" value={addUnit} onChange={(e) => setAddUnit(e.target.value)} placeholder="Unité (ex: comprimé)"
                className="rounded-lg border border-gray-300 bg-white px-3 h-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <input type="text" value={addCategory} onChange={(e) => setAddCategory(e.target.value)} placeholder="Catégorie"
                className="rounded-lg border border-gray-300 bg-white px-3 h-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <input type="number" value={addStock} onChange={(e) => setAddStock(e.target.value)} placeholder="Stock initial"
                className="rounded-lg border border-gray-300 bg-white px-3 h-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <button onClick={handleAdd} disabled={adding || !addName.trim()}
              className="flex h-10 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">
              {adding ? <LoadingSpinner size="sm" /> : 'Ajouter'}
            </button>
          </div>
        </div>

        {/* Liste des produits */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-8"><LoadingSpinner size="sm" message="Chargement..." /></div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Aucun produit trouvé.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-[11px] text-gray-400">
                      {p.category && <span>{p.category} · </span>}
                      {p.unit || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId === p.id ? (
                      <div className="flex items-center gap-1">
                        <input type="number" value={editStock} onChange={(e) => setEditStock(e.target.value)}
                          className="w-16 h-8 rounded-lg border border-blue-300 px-2 text-center text-xs font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <button onClick={() => handleSaveStock(p.id)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-600 text-white">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingId(p.id); setEditStock(String(p.main_depot_stock)) }}
                        className="flex h-8 min-w-[60px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200">
                        Stock: {p.main_depot_stock}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
