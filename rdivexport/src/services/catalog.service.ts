// ─── RdivExport – Service Catalogue Dépôt ─────────────────────────────────
// Opérations CRUD sur le catalogue de produits disponibles au dépôt.

import { supabase } from '@/lib/supabase'
import type { DepotCatalogItem, Product, PaginationParams } from '@/types'
import type { UUID } from '@/types/database'

// ─── Types internes ────────────────────────────────────────────────────────

interface CatalogRowWithProduct {
  id: UUID
  product_id: UUID
  available_quantity: number
  unit_price: string | null
  is_available: boolean
  restock_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  products?: {
    id: UUID
    name: string
    description: string | null
    code: string | null
    main_depot_stock: number
    unit: string | null
    category: string | null
    min_stock_threshold: number | null
    is_active: boolean
    created_at: string
    updated_at: string
  } | null
}

// ─── Utilitaires internes ───────────────────────────────────────────────────

function mapRowToProduct(row: NonNullable<CatalogRowWithProduct['products']>): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    code: row.code ?? undefined,
    main_depot_stock: row.main_depot_stock,
    unit: row.unit ?? 'unité',
    category: row.category ?? undefined,
    min_stock_threshold: row.min_stock_threshold ?? 0,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function mapRowToCatalogItem(row: CatalogRowWithProduct): DepotCatalogItem {
  return {
    id: row.id,
    product_id: row.product_id,
    product: row.products ? mapRowToProduct(row.products) : undefined,
    available_quantity: row.available_quantity,
    unit_price: row.unit_price !== null ? parseFloat(row.unit_price) : null,
    is_available: row.is_available,
    restock_date: row.restock_date,
    notes: row.notes ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// ─── Fonctions publiques ───────────────────────────────────────────────────

/**
 * Récupère toutes les entrées du catalogue dépôt avec les produits associés.
 */
export async function getCatalogItems(
  search?: string,
  pagination?: PaginationParams,
  showUnavailable?: boolean
): Promise<{ data: DepotCatalogItem[]; total: number; error: string | null }> {
  const page = pagination?.page ?? 1
  const itemsPerPage = pagination?.itemsPerPage ?? 50
  const from = (page - 1) * itemsPerPage
  const to = from + itemsPerPage - 1

  try {
    let countQuery = supabase
      .from('depot_catalog')
      .select('*', { count: 'exact', head: true })

    let dataQuery = supabase
      .from('depot_catalog')
      .select('*, products(*)')
      .order('created_at', { ascending: false })

    if (search?.trim()) {
      const term = `%${search.trim()}%`
      countQuery = countQuery.ilike('notes', term)
      dataQuery = dataQuery.ilike('notes', term)
    }

    if (!showUnavailable) {
      countQuery = countQuery.eq('is_available', true)
      dataQuery = dataQuery.eq('is_available', true)
    }

    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery.range(from, to),
    ])

    if (countResult.error) {
      return { data: [], total: 0, error: countResult.error.message }
    }

    if (dataResult.error) {
      return { data: [], total: countResult.count ?? 0, error: dataResult.error.message }
    }

    const items = (dataResult.data ?? []).map((row) =>
      mapRowToCatalogItem(row as unknown as CatalogRowWithProduct)
    )

    return { data: items, total: countResult.count ?? 0, error: null }
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : 'Erreur lors de la récupération du catalogue'
    return { data: [], total: 0, error: message }
  }
}

/**
 * Récupère une seule entrée du catalogue par son identifiant.
 */
export async function getCatalogItemById(
  id: UUID
): Promise<{ data: DepotCatalogItem | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('depot_catalog')
      .select('*, products(*)')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    if (!data) {
      return { data: null, error: 'Entrée introuvable' }
    }

    return { data: mapRowToCatalogItem(data as unknown as CatalogRowWithProduct), error: null }
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : 'Erreur lors de la récupération de l\'entrée du catalogue'
    return { data: null, error: message }
  }
}

/**
 * Ajoute un produit au catalogue dépôt.
 */
export async function addCatalogItem(
  productId: UUID,
  availableQuantity: number = 0,
  unitPrice?: number | null,
  notes?: string | null
): Promise<{ data: DepotCatalogItem | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('depot_catalog')
      .insert({
        product_id: productId,
        available_quantity: availableQuantity,
        unit_price: unitPrice !== undefined ? String(unitPrice) : null,
        notes: notes ?? null,
      })
      .select('*, products(*)')
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: mapRowToCatalogItem(data as unknown as CatalogRowWithProduct), error: null }
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : 'Erreur lors de l\'ajout au catalogue'
    return { data: null, error: message }
  }
}

/**
 * Met à jour une entrée du catalogue dépôt.
 */
export async function updateCatalogItem(
  id: UUID,
  updates: {
    available_quantity?: number
    unit_price?: number | null
    is_available?: boolean
    restock_date?: string | null
    notes?: string | null
  }
): Promise<{ data: DepotCatalogItem | null; error: string | null }> {
  try {
    const dbUpdates: Record<string, unknown> = {}
    if (updates.available_quantity !== undefined) dbUpdates.available_quantity = updates.available_quantity
    if (updates.unit_price !== undefined) dbUpdates.unit_price = updates.unit_price !== null ? String(updates.unit_price) : null
    if (updates.is_available !== undefined) dbUpdates.is_available = updates.is_available
    if (updates.restock_date !== undefined) dbUpdates.restock_date = updates.restock_date
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes

    const { data, error } = await supabase
      .from('depot_catalog')
      .update(dbUpdates)
      .eq('id', id)
      .select('*, products(*)')
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: mapRowToCatalogItem(data as unknown as CatalogRowWithProduct), error: null }
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : 'Erreur lors de la mise à jour du catalogue'
    return { data: null, error: message }
  }
}

/**
 * Bascule la disponibilité d'un produit dans le catalogue.
 */
export async function toggleCatalogAvailability(
  id: UUID
): Promise<{ data: DepotCatalogItem | null; error: string | null }> {
  try {
    // Récupérer l'état actuel
    const { data: current, error: fetchError } = await supabase
      .from('depot_catalog')
      .select('is_available')
      .eq('id', id)
      .single()

    if (fetchError || !current) {
      return { data: null, error: fetchError?.message ?? 'Entrée introuvable' }
    }

    return await updateCatalogItem(id, { is_available: !current.is_available })
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : 'Erreur lors du basculement de disponibilité'
    return { data: null, error: message }
  }
}

/**
 * Supprime un produit du catalogue dépôt.
 */
export async function removeCatalogItem(
  id: UUID
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('depot_catalog')
      .delete()
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : 'Erreur lors de la suppression du catalogue'
    return { error: message }
  }
}

/**
 * Compte le nombre de produits disponibles dans le catalogue.
 */
export async function getAvailableCatalogCount(): Promise<{ data: number; error: string | null }> {
  try {
    const { count, error } = await supabase
      .from('depot_catalog')
      .select('*', { count: 'exact', head: true })
      .eq('is_available', true)

    if (error) {
      return { data: 0, error: error.message }
    }

    return { data: count ?? 0, error: null }
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : 'Erreur lors du comptage du catalogue'
    return { data: 0, error: message }
  }
}
