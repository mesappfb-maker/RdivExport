// --- RdivExport - Depot Products Page ----------------------------------------
// Gestion des produits par le dépôt : liste, ajout manuel, import Excel,
// édition inline (nom, catégorie, stock), suppression.

import { useState, useCallback, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Product } from '@/types'

// --- Types locaux ------------------------------------------------------------

interface EditingProduct {
  id: string
  name: string
  category: string
  unit: string
  stock: string
}

// --- Composant ----------------------------------------------------------------

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

  // Édition inline (stock rapide)
  const [quickEditId, setQuickEditId] = useState<string | null>(null)
  const [quickEditStock, setQuickEditStock] = useState('')

  // Édition complète (modal)
  const [editProduct, setEditProduct] = useState<EditingProduct | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  // Suppression
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Toggle sections
  const [showImport, setShowImport] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

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

  // --- Ajouter un produit -----------------------------------------------------
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
      flash('success', `Produit \"${addName.trim()}\" ajouté.`)
      setAddName(''); setAddUnit(''); setAddCategory(''); setAddStock('0')
      setShowAdd(false)
      loadProducts()
    }
    setAdding(false)
  }, [addName, addUnit, addCategory, addStock, flash, loadProducts])

  // --- Modifier le stock rapidement (inline) ---------------------------------
  const handleSaveQuickStock = useCallback(async (productId: string) => {
    const val = parseInt(quickEditStock, 10)
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
    setQuickEditId(null)
  }, [quickEditStock, flash])

  // --- Ouvrir l'édition complète ---------------------------------------------
  const handleOpenEdit = useCallback((product: Product) => {
    setEditProduct({
      id: product.id,
      name: product.name,
      category: product.category ?? '',
      unit: product.unit ?? '',
      stock: String(product.main_depot_stock),
    })
  }, [])

  // --- Sauvegarder l'édition complète -----------------------------------------
  const handleSaveEdit = useCallback(async () => {
    if (!editProduct) return
    setEditSaving(true)
    const { error } = await supabase
      .from('products')
      .update({
        name: editProduct.name.trim() || null,
        category: editProduct.category.trim() || null,
        unit: editProduct.unit.trim() || null,
        main_depot_stock: parseInt(editProduct.stock, 10) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editProduct.id)
    if (error) {
      flash('error', 'Erreur: ' + error.message)
    } else {
      flash('success', `Produit \"${editProduct.name}\" mis à jour.`)
      setEditProduct(null)
      loadProducts()
    }
    setEditSaving(false)
  }, [editProduct, flash, loadProducts])

  // --- Supprimer un produit ---------------------------------------------------
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', deleteTarget.id)
    if (error) {
      flash('error', 'Erreur suppression: ' + error.message)
    } else {
      flash('success', `Produit \"${deleteTarget.name}\" supprimé.`)
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id))
    }
    setDeleting(false)
    setDeleteTarget(null)
  }, [deleteTarget, flash])

  // --- Import Excel ----------------------------------------------------------
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

      // Trouver les colonnes par noms correspondants à la base de données
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
      const catCol = findCol(['category', 'catégorie', 'categorie'])
      const codeCol = findCol(['code', 'codification'])
      const descCol = findCol(['description', 'desc', 'description'])

      if (!nameCol) {
        flash('error', 'Colonne \"nom\" ou \"name\" introuvable dans le fichier.')
        setImporting(false)
        return
      }

      // Récupérer tous les produits existants pour détecter doublons
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
        const code = codeCol ? String(row[codeCol] ?? '').trim() || null : null
        const description = descCol ? String(row[descCol] ?? '').trim() || null : null

        const existingId = nameToId.get(name.toLowerCase())

        if (existingId && !existingId.startsWith('new-')) {
          // Mettre à jour le produit existant
          const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
          if (stock > 0) updates.main_depot_stock = stock
          if (unit) updates.unit = unit
          if (category) updates.category = category
          if (code) updates.code = code
          if (description) updates.description = description

          const { error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', existingId)

          if (!error) updated++
          else skipped++
        } else {
          // Créer un nouveau produit
          const { error } = await supabase.from('products').insert({
            name, unit, main_depot_stock: stock, category, code, description,
          })
          if (!error) {
            created++
            nameToId.set(name.toLowerCase(), 'new-' + created)
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
    e.target.value = ''
  }, [flash, loadProducts])

  // Filtrage
  const filtered = search.trim()
    ? products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
      )
    : products

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div />
          <h1 className="text-lg font-bold text-gray-900">Produits du dépôt</h1>
          <button
            onClick={loadProducts}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 ${loading ? 'animate-spin' : ''}`}
            aria-label="Actualiser"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
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
        {/* Recherche + compteur */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit..."
              className="block flex-1 rounded-xl border border-gray-300 bg-white px-3 h-11 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button onClick={() => setShowAdd(!showAdd)}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700"
              aria-label="Ajouter un produit"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">{filtered.length} produit{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Ajout manuel (dépliable) */}
        {showAdd && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
            <h2 className="mb-2 text-base font-semibold text-gray-900">Ajouter un produit</h2>
            <div className="space-y-2">
              <input type="text" value={addName} onChange={(e) => setAddName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
                placeholder="Nom du produit *"
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 h-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <div className="grid grid-cols-3 gap-2">
                <input type="text" value={addUnit} onChange={(e) => setAddUnit(e.target.value)} placeholder="Unité"
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
        )}

        {/* Import Excel (dépliable) */}
        <button type="button" onClick={() => setShowImport(!showImport)}
          className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm text-left"
        >
          <div>
            <h2 className="text-base font-semibold text-gray-900">Import Excel</h2>
            <p className="text-xs text-gray-500">Importer depuis un fichier .xlsx, .xls ou .csv</p>
          </div>
          <svg className={`h-5 w-5 text-gray-400 transition-transform ${showImport ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {showImport && (
          <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs text-gray-500">
              Colonnes acceptées : <span className="font-medium">nom/name</span>, <span className="font-medium">unit/unité</span>, <span className="font-medium">stock/quantité</span>, <span className="font-medium">catégorie</span>, <span className="font-medium">code</span>, <span className="font-medium">description</span>.
              Les doublons sont mis à jour automatiquement.
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
        )}

        {/* Liste des produits */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-8"><LoadingSpinner size="sm" message="Chargement..." /></div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Aucun produit trouvé.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <li key={p.id} className="flex items-center gap-2 px-4 py-3">
                  {/* Info produit */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-[11px] text-gray-400">
                      {p.category && <span>{p.category} · </span>}
                      {p.unit || '—'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {/* Stock rapide */}
                    {quickEditId === p.id ? (
                      <div className="flex items-center gap-1">
                        <input type="number" value={quickEditStock} onChange={(e) => setQuickEditStock(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveQuickStock(p.id); if (e.key === 'Escape') setQuickEditId(null) }}
                          className="w-16 h-8 rounded-lg border border-blue-300 px-2 text-center text-xs font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <button onClick={() => handleSaveQuickStock(p.id)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-600 text-white">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setQuickEditId(p.id); setQuickEditStock(String(p.main_depot_stock)) }}
                        className={`flex h-8 min-w-[56px] items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors ${p.main_depot_stock > 0 ? 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200' : 'border border-red-200 bg-red-50 text-red-600'}`}>
                        {p.main_depot_stock}
                      </button>
                    )}

                    {/* Bouton modifier */}
                    <button onClick={() => handleOpenEdit(p)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                      aria-label="Modifier"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                      </svg>
                    </button>

                    {/* Bouton supprimer */}
                    <button onClick={() => setDeleteTarget(p)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Supprimer"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modal d'édition produit */}
      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditProduct(null)} />
          <div className="relative z-10 w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Modifier le produit</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Nom du produit *</label>
                <input type="text" value={editProduct.name} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 h-10 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Catégorie</label>
                  <input type="text" value={editProduct.category} onChange={(e) => setEditProduct({ ...editProduct, category: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 h-10 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Unité</label>
                  <input type="text" value={editProduct.unit} onChange={(e) => setEditProduct({ ...editProduct, unit: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 h-10 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Stock en dépôt</label>
                <input type="number" value={editProduct.stock} onChange={(e) => setEditProduct({ ...editProduct, stock: e.target.value })}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 h-10 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setEditProduct(null)}
                className="flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={handleSaveEdit} disabled={editSaving || !editProduct.name.trim()}
                className="flex h-11 flex-1 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {editSaving ? <LoadingSpinner size="sm" /> : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogue de confirmation de suppression */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Supprimer le produit"
        message={`Voulez-vous vraiment supprimer \"${deleteTarget?.name ?? ''}\" ? Cette action est irréversible. Les réquisitions existantes contenant ce produit ne seront pas affectées.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel={deleting ? 'Suppression...' : 'Supprimer définitivement'}
        variant="danger"
      />
    </div>
  )
}
