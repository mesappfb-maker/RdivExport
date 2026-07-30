// ─── RdivExport – Service Réquisitions ──────────────────────────────────────
// Création, lecture, mise à jour des réquisitions et de leurs lignes.

import { supabase } from '@/lib/supabase'
import { generateReferenceNumber } from '@/utils/formatters'
import type {
  Requisition,
  RequisitionItem,
  RequisitionStatus,
  CreateRequisitionInput,
  PaginationParams,
  PaginatedResponse,
  Product,
  Pharmacy,
  Profile,
} from '@/types'
import type { UUID } from '@/types/database'

// ─── Types internes ────────────────────────────────────────────────────────

/** Filtres applicables aux listes de réquisitions */
export interface RequisitionFilters {
  status?: RequisitionStatus
  pharmacyId?: UUID
  dateFrom?: string
  dateTo?: string
  search?: string
}

/** Élément du bordereau de livraison */
export interface DeliveryChecklistItem {
  item_id: UUID
  quantity_delivered: number
  checked: boolean
}

/** Résultat consolidé pour un produit à travers toutes les pharmacies */
export interface ConsolidatedProduct {
  product_id: UUID
  product_name: string
  product_unit?: string
  total_requested: number
  total_delivered: number
  pharmacy_count: number
  requisition_count: number
  pharmacies: Array<{
    pharmacy_id: UUID
    pharmacy_name: string
    quantity_requested: number
    quantity_delivered: number
    requisition_id: UUID
    requisition_ref: string
    status: RequisitionStatus
  }>
}

// ─── Utilitaires internes ───────────────────────────────────────────────────

/** Type intermédiaire pour les lignes de réquisition retournées par Supabase */
interface RequisitionRowWithJoins {
  id: UUID
  reference_number: string
  pharmacy_id: UUID
  created_by: UUID
  status: string
  comment: string | null
  validated_by: UUID | null
  validated_at: string | null
  delivered_by: UUID | null
  delivered_at: string | null
  cancelled_by: UUID | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
  pharmacies?: {
    id: UUID
    name: string
    code: string
    address: string | null
    phone: string | null
    whatsapp_number: string | null
    email: string | null
    is_active: boolean
    created_at: string
    updated_at: string
  } | null
}

/** Type intermédiaire pour les items avec jointure produit */
interface RequisitionItemRowWithProduct {
  id: UUID
  requisition_id: UUID
  product_id: UUID
  product_name: string
  quantity_requested: number
  quantity_delivered: number | null
  created_at: string
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

/** Transforme une ligne de base de données en objet Requisition métier */
function mapRowToRequisition(row: RequisitionRowWithJoins): Requisition {
  return {
    id: row.id,
    reference_number: row.reference_number,
    pharmacy_id: row.pharmacy_id,
    created_by: row.created_by,
    status: row.status as RequisitionStatus,
    comment: row.comment ?? undefined,
    validated_by: row.validated_by ?? undefined,
    validated_at: row.validated_at ?? undefined,
    delivered_by: row.delivered_by ?? undefined,
    delivered_at: row.delivered_at ?? undefined,
    cancelled_by: row.cancelled_by ?? undefined,
    cancelled_at: row.cancelled_at ?? undefined,
    cancel_reason: row.cancel_reason ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/** Transforme une ligne d'item en objet métier avec produit associé */
function mapRowToRequisitionItem(
  row: RequisitionItemRowWithProduct,
  product?: Product | null
): RequisitionItem {
  return {
    id: row.id,
    requisition_id: row.requisition_id,
    product_id: row.product_id,
    product: product ?? undefined,
    product_name: row.product_name,
    quantity_requested: row.quantity_requested,
    quantity_delivered: row.quantity_delivered ?? 0,
    created_at: row.created_at,
  }
}

/** Enrichit une réquisition avec ses relations */
function enrichRequisition(
  row: RequisitionRowWithJoins,
  pharmacy?: Pharmacy | null,
  items?: RequisitionItem[]
): Requisition {
  const base = mapRowToRequisition(row)
  return {
    ...base,
    pharmacy: pharmacy ?? undefined,
    items,
  }
}

/** Transforme une ligne de produit DB en objet Product métier */
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

/** Transforme une ligne de profil en objet Profile métier */
function mapRowToProfile(row: any): Profile {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone ?? undefined,
    role: row.role as Profile['role'],
    pharmacy_id: row.pharmacy_id ?? undefined,
    is_active: row.is_active !== false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// ─── Fonctions publiques ───────────────────────────────────────────────────

/**
 * Crée une nouvelle réquisition avec ses lignes.
 * Génère un numéro de référence unique, insère l'en-tête puis les articles.
 * En cas d'erreur sur les articles, la réquisition orpheline est supprimée.
 */
export async function createRequisition(
  input: CreateRequisitionInput,
  createdBy: UUID
): Promise<{ data: Requisition | null; error: string | null }> {
  try {
    // Récupérer le code de la pharmacie pour la référence
    let pharmacyCode: string | undefined
    let todayCount = 0
    try {
      const { data: pharm } = await supabase
        .from('pharmacies')
        .select('code')
        .eq('id', input.pharmacy_id)
        .single()
      if (pharm?.code) {
        pharmacyCode = pharm.code
        // Compter les réquisitions de cette pharmacie aujourd'hui
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const { count } = await supabase
          .from('requisitions')
          .select('*', { count: 'exact', head: true })
          .eq('pharmacy_id', input.pharmacy_id)
          .gte('created_at', today.toISOString())
        todayCount = count ?? 0
      }
    } catch (_) {
      // En cas d'erreur, on utilise le fallback aléatoire
    }

    const referenceNumber = generateReferenceNumber(pharmacyCode, todayCount)

    // 1. Insérer l'en-tête de réquisition
    const { data: requisition, error: reqError } = await supabase
      .from('requisitions')
      .insert({
        reference_number: referenceNumber,
        pharmacy_id: input.pharmacy_id,
        created_by: createdBy,
        status: 'pending',
        comment: input.comment ?? null,
      })
      .select()
      .single()

    if (reqError) {
      return { data: null, error: reqError.message }
    }

    if (!requisition) {
      return { data: null, error: 'Erreur lors de la création de la réquisition' }
    }

    // 2. Préparer les lignes d'articles
    const itemsToInsert = input.items.map((item) => ({
      requisition_id: requisition.id,
      product_id: item.product_id,
      product_name: item.product_name ?? null,
      quantity_requested: item.quantity_requested,
    }))

    // 3. Insérer toutes les lignes
    const { error: itemsError } = await supabase
      .from('requisition_items')
      .insert(itemsToInsert)

    if (itemsError) {
      // Nettoyer : supprimer la réquisition orpheline
      await supabase.from('requisitions').delete().eq('id', requisition.id)
      return { data: null, error: `Erreur lors de l'insertion des articles : ${itemsError.message}` }
    }

    // 4. Récupérer la réquisition complète avec items
    const fullReq = await getRequisitionById(requisition.id)
    if (fullReq.error) {
      // Retourner la réquisition de base si l'enrichissement échoue
      return { data: mapRowToRequisition(requisition as RequisitionRowWithJoins), error: null }
    }

    return { data: fullReq.data, error: null }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Erreur lors de la création de la réquisition'
    return { data: null, error: message }
  }
}

/**
 * Récupère les réquisitions d'une pharmacie avec filtres et pagination.
 */
export async function getRequisitionsByPharmacy(
  pharmacyId: UUID,
  filters?: RequisitionFilters,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Requisition> & { error: string | null }> {
  const page = pagination?.page ?? 1
  const itemsPerPage = pagination?.itemsPerPage ?? 20
  const from = (page - 1) * itemsPerPage
  const to = from + itemsPerPage - 1

  try {
    // Construction des requêtes de comptage et de données
    let countQuery = supabase
      .from('requisitions')
      .select('*', { count: 'exact', head: true })
      .eq('pharmacy_id', pharmacyId)

    let dataQuery = supabase
      .from('requisitions')
      .select('*, pharmacies(*)')
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false })

    // Appliquer les filtres
    if (filters?.status) {
      countQuery = countQuery.eq('status', filters.status)
      dataQuery = dataQuery.eq('status', filters.status)
    }

    if (filters?.dateFrom) {
      countQuery = countQuery.gte('created_at', filters.dateFrom)
      dataQuery = dataQuery.gte('created_at', filters.dateFrom)
    }

    if (filters?.dateTo) {
      const endOfDay = new Date(filters.dateTo)
      endOfDay.setHours(23, 59, 59, 999)
      countQuery = countQuery.lte('created_at', endOfDay.toISOString())
      dataQuery = dataQuery.lte('created_at', endOfDay.toISOString())
    }

    if (filters?.search) {
      const term = `%${filters.search.trim()}%`
      countQuery = countQuery.ilike('reference_number', term)
      dataQuery = dataQuery.ilike('reference_number', term)
    }

    // Exécuter en parallèle
    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery.range(from, to),
    ])

    if (countResult.error) {
      return { data: [], total: 0, page, itemsPerPage, totalPages: 0, error: countResult.error.message }
    }

    if (dataResult.error) {
      return {
        data: [],
        total: countResult.count ?? 0,
        page,
        itemsPerPage,
        totalPages: Math.ceil((countResult.count ?? 0) / itemsPerPage),
        error: dataResult.error.message,
      }
    }

    const total = countResult.count ?? 0
    const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))

    // Enrichir chaque réquisition avec ses items
    const requisitions = await Promise.all(
      (dataResult.data ?? []).map(async (row) => {
        const r = row as unknown as RequisitionRowWithJoins & { pharmacies: NonNullable<RequisitionRowWithJoins['pharmacies']> }
        const items = await getRequisitionItems(r.id)
        return enrichRequisition(r, r.pharmacies, items)
      })
    )

    return { data: requisitions, total, page, itemsPerPage, totalPages, error: null }
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : 'Erreur lors de la récupération des réquisitions de la pharmacie'
    return { data: [], total: 0, page, itemsPerPage, totalPages: 0, error: message }
  }
}

/**
 * Récupère une réquisition unique par son identifiant avec toutes ses relations.
 */
export async function getRequisitionById(
  id: UUID
): Promise<{ data: Requisition | null; error: string | null }> {
  try {
    const { data: reqData, error: reqError } = await supabase
      .from('requisitions')
      .select('*, pharmacies(*)')
      .eq('id', id)
      .single()

    if (reqError) {
      return { data: null, error: reqError.message }
    }

    if (!reqData) {
      return { data: null, error: 'Réquisition introuvable' }
    }

    const row = reqData as unknown as RequisitionRowWithJoins & { pharmacies: NonNullable<RequisitionRowWithJoins['pharmacies']> }

    // Récupérer les items avec produits
    const items = await getRequisitionItems(id)
    const requisition = enrichRequisition(row, row.pharmacies, items)

    // Récupérer les profils des acteurs (créateur, validateur, livreur, annulateur)
    const profileIds: UUID[] = [
      row.created_by,
      row.validated_by,
      row.delivered_by,
      row.cancelled_by,
    ].filter((v): v is UUID => v !== null)

    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', profileIds)

      if (profiles && profiles.length > 0) {
        const profileMap = new Map<string, Profile>(
          profiles.map((p) => [p.id, mapRowToProfile(p)])
        )

        if (row.created_by) requisition.created_by_profile = profileMap.get(row.created_by)
        if (row.validated_by) requisition.validated_by_profile = profileMap.get(row.validated_by)
        if (row.delivered_by) requisition.delivered_by_profile = profileMap.get(row.delivered_by)
        if (row.cancelled_by) requisition.cancelled_by_profile = profileMap.get(row.cancelled_by)
      }
    }

    return { data: requisition, error: null }
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : 'Erreur lors de la récupération de la réquisition'
    return { data: null, error: message }
  }
}

/**
 * Récupère toutes les réquisitions (pour le réquisitionniste principal)
 * avec filtres et pagination.
 */
export async function getAllRequisitions(
  filters?: RequisitionFilters,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Requisition> & { error: string | null }> {
  const page = pagination?.page ?? 1
  const itemsPerPage = pagination?.itemsPerPage ?? 20
  const from = (page - 1) * itemsPerPage
  const to = from + itemsPerPage - 1

  try {
    let countQuery = supabase
      .from('requisitions')
      .select('*', { count: 'exact', head: true })

    let dataQuery = supabase
      .from('requisitions')
      .select('*, pharmacies(*)')
      .order('created_at', { ascending: false })

    if (filters?.status) {
      countQuery = countQuery.eq('status', filters.status)
      dataQuery = dataQuery.eq('status', filters.status)
    }

    if (filters?.pharmacyId) {
      countQuery = countQuery.eq('pharmacy_id', filters.pharmacyId)
      dataQuery = dataQuery.eq('pharmacy_id', filters.pharmacyId)
    }

    if (filters?.dateFrom) {
      countQuery = countQuery.gte('created_at', filters.dateFrom)
      dataQuery = dataQuery.gte('created_at', filters.dateFrom)
    }

    if (filters?.dateTo) {
      const endOfDay = new Date(filters.dateTo)
      endOfDay.setHours(23, 59, 59, 999)
      countQuery = countQuery.lte('created_at', endOfDay.toISOString())
      dataQuery = dataQuery.lte('created_at', endOfDay.toISOString())
    }

    if (filters?.search) {
      const term = `%${filters.search.trim()}%`
      const orFilter = `reference_number.ilike.${term},comment.ilike.${term}`
      countQuery = countQuery.or(orFilter)
      dataQuery = dataQuery.or(orFilter)
    }

    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery.range(from, to),
    ])

    if (countResult.error) {
      return { data: [], total: 0, page, itemsPerPage, totalPages: 0, error: countResult.error.message }
    }

    if (dataResult.error) {
      return {
        data: [],
        total: countResult.count ?? 0,
        page,
        itemsPerPage,
        totalPages: Math.ceil((countResult.count ?? 0) / itemsPerPage),
        error: dataResult.error.message,
      }
    }

    const total = countResult.count ?? 0
    const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))

    const requisitions = await Promise.all(
      (dataResult.data ?? []).map(async (row) => {
        const r = row as unknown as RequisitionRowWithJoins & { pharmacies: NonNullable<RequisitionRowWithJoins['pharmacies']> }
        const items = await getRequisitionItems(r.id)
        return enrichRequisition(r, r.pharmacies, items)
      })
    )

    return { data: requisitions, total, page, itemsPerPage, totalPages, error: null }
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : 'Erreur lors de la récupération des réquisitions'
    return { data: [], total: 0, page, itemsPerPage, totalPages: 0, error: message }
  }
}

/**
 * Met à jour le statut d'une réquisition.
 * Selon le statut, renseigne automatiquement le validateur/livreur/annulateur
 * et la date correspondante.
 */
export async function updateRequisitionStatus(
  id: UUID,
  status: RequisitionStatus,
  userId: UUID,
  cancelReason?: string
): Promise<{ data: Requisition | null; error: string | null }> {
  try {
    const updateFields: Record<string, unknown> = { status }

    switch (status) {
      case 'validated':
        updateFields.validated_by = userId
        updateFields.validated_at = new Date().toISOString()
        break
      case 'delivered':
        updateFields.delivered_by = userId
        updateFields.delivered_at = new Date().toISOString()
        break
      case 'cancelled':
        updateFields.cancelled_by = userId
        updateFields.cancelled_at = new Date().toISOString()
        updateFields.cancel_reason = cancelReason ?? null
        break
      default:
        break
    }

    const { data, error } = await supabase
      .from('requisitions')
      .update(updateFields)
      .eq('id', id)
      .select('*, pharmacies(*)')
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    if (!data) {
      return { data: null, error: 'Réquisition introuvable après la mise à jour' }
    }

    const row = data as unknown as RequisitionRowWithJoins & { pharmacies: NonNullable<RequisitionRowWithJoins['pharmacies']> }
    const items = await getRequisitionItems(id)
    const requisition = enrichRequisition(row, row.pharmacies, items)

    return { data: requisition, error: null }
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : 'Erreur lors de la mise à jour du statut de la réquisition'
    return { data: null, error: message }
  }
}

/**
 * Met à jour le bordereau de livraison d'une réquisition.
 * Met à jour la quantité livrée de chaque item puis passe le statut à 'delivered'.
 */
export async function updateDeliveryChecklist(
  requisitionId: UUID,
  items: DeliveryChecklistItem[],
  deliveredBy: UUID
): Promise<{ data: Requisition | null; error: string | null }> {
  try {
    // 1. Mettre à jour chaque item individuellement
    const updatePromises = items.map((item) =>
      supabase
        .from('requisition_items')
        .update({ quantity_delivered: item.quantity_delivered })
        .eq('id', item.item_id)
        .eq('requisition_id', requisitionId)
    )

    const updateResults = await Promise.all(updatePromises)
    const firstError = updateResults.find((r) => r.error)
    if (firstError?.error) {
      return {
        data: null,
        error: `Erreur lors de la mise à jour des articles : ${firstError.error.message}`,
      }
    }

    // 2. Mettre à jour le statut de la réquisition
    const { error: statusError } = await supabase
      .from('requisitions')
      .update({
        status: 'delivered',
        delivered_by: deliveredBy,
        delivered_at: new Date().toISOString(),
      })
      .eq('id', requisitionId)

    if (statusError) {
      return { data: null, error: statusError.message }
    }

    // 3. Retourner la réquisition complète mise à jour
    return await getRequisitionById(requisitionId)
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : 'Erreur lors de la mise à jour du bordereau de livraison'
    return { data: null, error: message }
  }
}

/**
 * Récupère une vue consolidée des demandes par produit à travers les pharmacies.
 * Agrège les quantités demandées et livrées pour chaque produit.
 */
export async function getConsolidatedRequisitions(
  filters?: RequisitionFilters
): Promise<{ data: ConsolidatedProduct[]; error: string | null }> {
  try {
    let query = supabase
      .from('requisition_items')
      .select('*, requisitions!inner(*, pharmacies(*)), products!inner(*)')
      .order('created_at', { ascending: false })

    // Exclure les brouillons et les annulées
    query = query.not('requisitions.status', 'in', '(draft,cancelled)')

    if (filters?.pharmacyId) {
      query = query.eq('requisitions.pharmacy_id', filters.pharmacyId)
    }

    if (filters?.status) {
      query = query.eq('requisitions.status', filters.status)
    }

    const { data, error } = await query

    if (error) {
      return { data: [], error: error.message }
    }

    if (!data || data.length === 0) {
      return { data: [], error: null }
    }

    // Agréger par produit
    const productMap = new Map<string, ConsolidatedProduct>()

    for (const row of data) {
      const typedRow = row as unknown as RequisitionItemRowWithProduct & {
        requisitions: {
          id: UUID
          reference_number: string
          pharmacy_id: UUID
          status: string
          pharmacies: { id: UUID; name: string }
        }
      }

      const productId = typedRow.product_id
      const productName = typedRow.products?.name ?? 'Produit inconnu'
      const productUnit = typedRow.products?.unit ?? undefined
      const existing = productMap.get(productId)

      const pharmacyEntry = {
        pharmacy_id: typedRow.requisitions.pharmacy_id,
        pharmacy_name: typedRow.requisitions.pharmacies.name,
        quantity_requested: typedRow.quantity_requested,
        quantity_delivered: typedRow.quantity_delivered ?? 0,
        requisition_id: typedRow.requisitions.id,
        requisition_ref: typedRow.requisitions.reference_number,
        status: typedRow.requisitions.status as RequisitionStatus,
      }

      if (existing) {
        existing.total_requested += typedRow.quantity_requested
        existing.total_delivered += typedRow.quantity_delivered ?? 0
        existing.requisition_count += 1
        const alreadyAdded = existing.pharmacies.some(
          (p) => p.requisition_id === typedRow.requisitions.id
        )
        if (!alreadyAdded) {
          existing.pharmacies.push(pharmacyEntry)
          existing.pharmacy_count = new Set(
            existing.pharmacies.map((p) => p.pharmacy_id)
          ).size
        }
      } else {
        productMap.set(productId, {
          product_id: productId,
          product_name: productName,
          product_unit: productUnit,
          total_requested: typedRow.quantity_requested,
          total_delivered: typedRow.quantity_delivered ?? 0,
          pharmacy_count: 1,
          requisition_count: 1,
          pharmacies: [pharmacyEntry],
        })
      }
    }

    // Trier par quantité totale demandée (décroissant)
    const consolidated = Array.from(productMap.values()).sort(
      (a, b) => b.total_requested - a.total_requested
    )

    return { data: consolidated, error: null }
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : 'Erreur lors de la consolidation des réquisitions'
    return { data: [], error: message }
  }
}

// ─── Fonctions internes ─────────────────────────────────────────────────────

/**
 * Met à jour une réquisition existante (articles uniquement).
 * Seules les réquisitions en statut pending ou draft peuvent être modifiées.
 */
export async function updateRequisitionItems(
  requisitionId: UUID,
  items: Array<{ product_id: string; product_name?: string; quantity_requested: number }>,
  comment?: string
): Promise<{ data: Requisition | null; error: string | null }> {
  try {
    // 1. Vérifier que la réquisition est modifiable
    const { data: req, error: reqError } = await supabase
      .from('requisitions')
      .select('status')
      .eq('id', requisitionId)
      .single()

    if (reqError || !req) {
      return { data: null, error: 'Réquisition introuvable.' }
    }

    if (req.status !== 'pending' && req.status !== 'draft') {
      return { data: null, error: 'Cette réquisition ne peut plus être modifiée (déjà traitée par le centralisateur).' }
    }

    // 2. Supprimer les anciens items
    const { error: delError } = await supabase
      .from('requisition_items')
      .delete()
      .eq('requisition_id', requisitionId)

    if (delError) {
      return { data: null, error: 'Erreur lors de la mise à jour: ' + delError.message }
    }

    // 3. Insérer les nouveaux items
    const itemsToInsert = items.map((item) => ({
      requisition_id: requisitionId,
      product_id: item.product_id,
      product_name: item.product_name ?? null,
      quantity_requested: item.quantity_requested,
    }))

    const { error: insError } = await supabase
      .from('requisition_items')
      .insert(itemsToInsert)

    if (insError) {
      return { data: null, error: 'Erreur lors de l\'insertion des articles : ' + insError.message }
    }

    // 4. Mettre à jour le commentaire si fourni
    if (comment !== undefined) {
      await supabase
        .from('requisitions')
        .update({ comment: comment || null, updated_at: new Date().toISOString() })
        .eq('id', requisitionId)
    }

    // 5. Retourner la réquisition complète
    return await getRequisitionById(requisitionId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour'
    return { data: null, error: message }
  }
}

/** Récupère tous les items d'une réquisition avec les produits associés */
async function getRequisitionItems(requisitionId: UUID): Promise<RequisitionItem[]> {
  const { data, error } = await supabase
    .from('requisition_items')
    .select('*, products(*)')
    .eq('requisition_id', requisitionId)
    .order('created_at', { ascending: true })

  if (error || !data) {
    return []
  }

  return data.map((row) => {
    const typedRow = row as unknown as RequisitionItemRowWithProduct
    const product = typedRow.products ? mapRowToProduct(typedRow.products) : null
    const mapped = mapRowToRequisitionItem(typedRow, product)
    // Use product_name as fallback when product join is null
    if (!mapped.product && typedRow.product_name) {
      mapped.product_name = typedRow.product_name
    }
    return mapped
  })
}
