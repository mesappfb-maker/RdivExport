// ─── RdivExport – Service Produits ──────────────────────────────────────────
// Opérations CRUD et recherche sur le catalogue de produits (médicaments).

import { supabase } from '@/lib/supabase'
import type { Product, PaginationParams, PaginatedResponse } from '@/types'
import type { UUID } from '@/types/database'

// ─── Utilitaire interne ─────────────────────────────────────────────────────

/** Transforme une ligne de base de données en objet Product métier */
function mapRowToProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    code: row.code ?? undefined,
    main_depot_stock: row.main_depot_stock ?? 0,
    unit: row.unit ?? 'unité',
    category: row.category ?? undefined,
    min_stock_threshold: row.min_stock_threshold ?? 0,
    is_active: row.is_active !== false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// ─── Fonctions publiques ───────────────────────────────────────────────────

/**
 * Recherche de produits par nom (recherche insensible à la casse).
 * Utilise l'opérateur ILIKE avec des jokers pour une recherche partielle.
 *
 * @param query  - Terme de recherche (ex. "paracétamol")
 * @param limit  - Nombre maximal de résultats (défaut : 50)
 * @returns Liste de produits correspondants
 */
export async function searchProducts(
  query: string,
  limit: number = 50
): Promise<{ data: Product[]; error: string | null }> {
  try {
    const trimmed = query.trim()

    const queryBuilder = supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .limit(limit)

    // Appliquer le filtre ILIKE seulement si la recherche n'est pas vide
    const result = trimmed
      ? await queryBuilder.ilike('name', `%${trimmed}%`)
      : await queryBuilder

    if (result.error) {
      return { data: [], error: result.error.message }
    }

    return {
      data: (result.data ?? []).map(mapRowToProduct),
      error: null,
    }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Erreur lors de la recherche de produits'
    return { data: [], error: message }
  }
}

/**
 * Récupère la liste paginée de tous les produits actifs.
 *
 * @param pagination - Paramètres de pagination (page, itemsPerPage)
 * @returns Réponse paginée avec les produits et les métadonnées de pagination
 */
export async function getAllProducts(
  pagination: PaginationParams
): Promise<PaginatedResponse<Product> & { error: string | null }> {
  const { page, itemsPerPage } = pagination
  const from = (page - 1) * itemsPerPage
  const to = from + itemsPerPage - 1

  try {
    // Compter le nombre total d'enregistrements
    const { count, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    if (countError) {
      return {
        data: [],
        total: 0,
        page,
        itemsPerPage,
        totalPages: 0,
        error: countError.message,
      }
    }

    const total = count ?? 0
    const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))

    // Récupérer la page demandée
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .range(from, to)

    if (error) {
      return {
        data: [],
        total,
        page,
        itemsPerPage,
        totalPages,
        error: error.message,
      }
    }

    return {
      data: (data ?? []).map(mapRowToProduct),
      total,
      page,
      itemsPerPage,
      totalPages,
      error: null,
    }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Erreur lors de la récupération des produits'
    return {
      data: [],
      total: 0,
      page,
      itemsPerPage,
      totalPages: 0,
      error: message,
    }
  }
}

/**
 * Récupère un produit unique par son identifiant.
 *
 * @param id - UUID du produit
 * @returns Le produit trouvé ou null si introuvable
 */
export async function getProductById(
  id: UUID
): Promise<{ data: Product | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    if (!data) {
      return { data: null, error: 'Produit introuvable' }
    }

    return { data: mapRowToProduct(data), error: null }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Erreur lors de la récupération du produit'
    return { data: null, error: message }
  }
}
