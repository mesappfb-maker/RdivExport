// ─── RdivExport – Service Commandes ───────────────────────────────────────
// Création, lecture, mise à jour des commandes et de leurs lignes.

import { supabase } from '@/lib/supabase'
import type { Order, OrderItem, OrderStatus, CreateOrderInput, Pharmacy, Product, Profile, PaginationParams } from '@/types'
import type { UUID } from '@/types/database'

// ─── Types internes ────────────────────────────────────────────────────────

export interface OrderFilters {
  status?: OrderStatus
  pharmacyId?: UUID
  dateFrom?: string
  dateTo?: string
  search?: string
}

interface OrderRowWithJoins {
  id: UUID
  reference_number: string
  pharmacy_id: UUID
  status: string
  total_amount: string | null
  comment: string | null
  confirmed_by: UUID | null
  confirmed_at: string | null
  cancelled_by: UUID | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_by: UUID
  created_at: string
  updated_at: string
  pharmacies?: {
    id: UUID; name: string; code: string; address: string | null; phone: string | null
    whatsapp_number: string | null; email: string | null; is_active: boolean
    created_at: string; updated_at: string
  } | null
}

interface OrderItemRowWithProduct {
  id: UUID; order_id: UUID; product_id: UUID; quantity_ordered: number
  unit_price: string; quantity_delivered: number; comment: string | null
  created_at: string; updated_at: string
  products?: { id: UUID; name: string; description: string | null; code: string | null
    main_depot_stock: number; unit: string | null; category: string | null
    min_stock_threshold: number | null; is_active: boolean; created_at: string; updated_at: string
  } | null
}

// ─── Utilitaires internes ───────────────────────────────────────────────────

function mapRowToProduct(row: NonNullable<OrderItemRowWithProduct['products']>): Product {
  return { id: row.id, name: row.name, description: row.description ?? undefined, code: row.code ?? undefined, main_depot_stock: row.main_depot_stock, unit: row.unit ?? 'unité', category: row.category ?? undefined, min_stock_threshold: row.min_stock_threshold ?? 0, is_active: row.is_active, created_at: row.created_at, updated_at: row.updated_at }
}

function mapRowToOrderItem(row: OrderItemRowWithProduct, product?: Product | null): OrderItem {
  return { id: row.id, order_id: row.order_id, product_id: row.product_id, product: product ?? undefined, quantity_ordered: row.quantity_ordered, unit_price: parseFloat(row.unit_price) || 0, quantity_delivered: row.quantity_delivered, comment: row.comment ?? undefined, created_at: row.created_at, updated_at: row.updated_at }
}

function mapRowToOrder(row: OrderRowWithJoins): Order {
  return { id: row.id, reference_number: row.reference_number, pharmacy_id: row.pharmacy_id, status: row.status as OrderStatus, total_amount: row.total_amount !== null ? parseFloat(row.total_amount) : 0, comment: row.comment ?? undefined, confirmed_by: row.confirmed_by ?? undefined, confirmed_at: row.confirmed_at ?? undefined, cancelled_by: row.cancelled_by ?? undefined, cancelled_at: row.cancelled_at ?? undefined, cancel_reason: row.cancel_reason ?? undefined, created_by: row.created_by, created_at: row.created_at, updated_at: row.updated_at }
}

function enrichOrder(row: OrderRowWithJoins, pharmacy?: Pharmacy | null, items?: OrderItem[], profiles?: Map<string, Profile>): Order {
  const base = mapRowToOrder(row)
  return { ...base, pharmacy: pharmacy ?? undefined, items, confirmed_by_profile: row.confirmed_by ? profiles?.get(row.confirmed_by) : undefined, cancelled_by_profile: row.cancelled_by ? profiles?.get(row.cancelled_by) : undefined, created_by_profile: row.created_by ? profiles?.get(row.created_by) : undefined }
}

function mapRowToProfile(row: { id: UUID; user_id: UUID; full_name: string; email: string; phone: string | null; role: string; pharmacy_id: UUID | null; avatar_url: string | null; is_active: boolean; created_at: string; updated_at: string }): Profile {
  return { id: row.id, user_id: row.user_id, full_name: row.full_name, email: row.email, phone: row.phone ?? undefined, role: row.role as Profile['role'], pharmacy_id: row.pharmacy_id ?? undefined, is_active: row.is_active, created_at: row.created_at, updated_at: row.updated_at }
}

async function getOrderItems(orderId: UUID): Promise<OrderItem[]> {
  const { data, error } = await supabase.from('order_items').select('*, products(*)').eq('order_id', orderId).order('created_at', { ascending: true })
  if (error || !data) return []
  return data.map((row) => { const typedRow = row as unknown as OrderItemRowWithProduct; const product = typedRow.products ? mapRowToProduct(typedRow.products) : null; return mapRowToOrderItem(typedRow, product) })
}

function generateOrderReferenceNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const datePart = `${year}${month}${day}`
  const randomPart = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `CMD-${datePart}-${randomPart}`
}

// ─── Fonctions publiques ───────────────────────────────────────────────────

export async function createOrder(input: CreateOrderInput, createdBy: UUID): Promise<{ data: Order | null; error: string | null }> {
  try {
    const referenceNumber = generateOrderReferenceNumber()
    const totalAmount = input.items.reduce((sum, item) => sum + item.unit_price * item.quantity_ordered, 0)
    const { data: order, error: orderError } = await supabase.from('orders').insert({ reference_number: referenceNumber, pharmacy_id: input.pharmacy_id, created_by: createdBy, status: 'pending', total_amount: String(totalAmount), comment: input.comment ?? null }).select().single()
    if (orderError) return { data: null, error: orderError.message }
    if (!order) return { data: null, error: 'Erreur lors de la création de la commande' }
    const itemsToInsert = input.items.map((item) => ({ order_id: order.id, product_id: item.product_id, quantity_ordered: item.quantity_ordered, unit_price: String(item.unit_price), comment: item.comment ?? null }))
    const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert)
    if (itemsError) { await supabase.from('orders').delete().eq('id', order.id); return { data: null, error: `Erreur articles : ${itemsError.message}` } }
    return await getOrderById(order.id)
  } catch (err) { const message = err instanceof Error ? err.message : 'Erreur lors de la création'; return { data: null, error: message } }
}

export async function getOrdersByPharmacy(pharmacyId: UUID, filters?: OrderFilters, pagination?: PaginationParams): Promise<{ data: Order[]; total: number; page: number; totalPages: number; error: string | null }> {
  const page = pagination?.page ?? 1; const itemsPerPage = pagination?.itemsPerPage ?? 20; const from = (page - 1) * itemsPerPage; const to = from + itemsPerPage - 1
  try {
    let countQuery = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('pharmacy_id', pharmacyId)
    let dataQuery = supabase.from('orders').select('*, pharmacies(*)').eq('pharmacy_id', pharmacyId).order('created_at', { ascending: false })
    if (filters?.status) { countQuery = countQuery.eq('status', filters.status); dataQuery = dataQuery.eq('status', filters.status) }
    if (filters?.dateFrom) { countQuery = countQuery.gte('created_at', filters.dateFrom); dataQuery = dataQuery.gte('created_at', filters.dateFrom) }
    if (filters?.dateTo) { const endOfDay = new Date(filters.dateTo); endOfDay.setHours(23, 59, 59, 999); countQuery = countQuery.lte('created_at', endOfDay.toISOString()); dataQuery = dataQuery.lte('created_at', endOfDay.toISOString()) }
    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery.range(from, to)])
    if (countResult.error) return { data: [], total: 0, page, totalPages: 0, error: countResult.error.message }
    if (dataResult.error) return { data: [], total: countResult.count ?? 0, page, totalPages: Math.ceil((countResult.count ?? 0) / itemsPerPage), error: dataResult.error.message }
    const total = countResult.count ?? 0; const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))
    const orders = await Promise.all((dataResult.data ?? []).map(async (row) => { const r = row as unknown as OrderRowWithJoins & { pharmacies: NonNullable<OrderRowWithJoins['pharmacies']> }; const items = await getOrderItems(r.id); return enrichOrder(r, r.pharmacies, items) }))
    return { data: orders, total, page, totalPages, error: null }
  } catch (err) { const message = err instanceof Error ? err.message : 'Erreur récupération commandes'; return { data: [], total: 0, page, totalPages: 0, error: message } }
}

export async function getAllOrders(filters?: OrderFilters, pagination?: PaginationParams): Promise<{ data: Order[]; total: number; page: number; totalPages: number; error: string | null }> {
  const page = pagination?.page ?? 1; const itemsPerPage = pagination?.itemsPerPage ?? 20; const from = (page - 1) * itemsPerPage; const to = from + itemsPerPage - 1
  try {
    let countQuery = supabase.from('orders').select('*', { count: 'exact', head: true })
    let dataQuery = supabase.from('orders').select('*, pharmacies(*)').order('created_at', { ascending: false })
    if (filters?.status) { countQuery = countQuery.eq('status', filters.status); dataQuery = dataQuery.eq('status', filters.status) }
    if (filters?.pharmacyId) { countQuery = countQuery.eq('pharmacy_id', filters.pharmacyId); dataQuery = dataQuery.eq('pharmacy_id', filters.pharmacyId) }
    if (filters?.dateFrom) { countQuery = countQuery.gte('created_at', filters.dateFrom); dataQuery = dataQuery.gte('created_at', filters.dateFrom) }
    if (filters?.dateTo) { const endOfDay = new Date(filters.dateTo); endOfDay.setHours(23, 59, 59, 999); countQuery = countQuery.lte('created_at', endOfDay.toISOString()); dataQuery = dataQuery.lte('created_at', endOfDay.toISOString()) }
    if (filters?.search) { const term = `%${filters.search.trim()}%`; const orFilter = `reference_number.ilike.${term}`; countQuery = countQuery.or(orFilter); dataQuery = dataQuery.or(orFilter) }
    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery.range(from, to)])
    if (countResult.error) return { data: [], total: 0, page, totalPages: 0, error: countResult.error.message }
    if (dataResult.error) return { data: [], total: countResult.count ?? 0, page, totalPages: Math.ceil((countResult.count ?? 0) / itemsPerPage), error: dataResult.error.message }
    const total = countResult.count ?? 0; const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))
    const orders = await Promise.all((dataResult.data ?? []).map(async (row) => { const r = row as unknown as OrderRowWithJoins & { pharmacies: NonNullable<OrderRowWithJoins['pharmacies']> }; const items = await getOrderItems(r.id); return enrichOrder(r, r.pharmacies, items) }))
    return { data: orders, total, page, totalPages, error: null }
  } catch (err) { const message = err instanceof Error ? err.message : 'Erreur récupération commandes'; return { data: [], total: 0, page, totalPages: 0, error: message } }
}

export async function getOrderById(id: UUID): Promise<{ data: Order | null; error: string | null }> {
  try {
    const { data, error } = await supabase.from('orders').select('*, pharmacies(*)').eq('id', id).single()
    if (error) return { data: null, error: error.message }
    if (!data) return { data: null, error: 'Commande introuvable' }
    const row = data as unknown as OrderRowWithJoins & { pharmacies: NonNullable<OrderRowWithJoins['pharmacies']> }
    const items = await getOrderItems(id)
    const profileIds: UUID[] = [row.created_by, row.confirmed_by, row.cancelled_by].filter((v): v is UUID => v !== null)
    let profileMap: Map<string, Profile> | undefined
    if (profileIds.length > 0) { const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', profileIds); if (profiles && profiles.length > 0) { profileMap = new Map(profiles.map((p) => [p.user_id, mapRowToProfile(p)])) } }
    const order = enrichOrder(row, row.pharmacies, items, profileMap)
    return { data: order, error: null }
  } catch (err) { const message = err instanceof Error ? err.message : 'Erreur récupération commande'; return { data: null, error: message } }
}

export async function confirmOrder(id: UUID, userId: UUID): Promise<{ data: Order | null; error: string | null }> {
  try {
    const { error } = await supabase.from('orders').update({ status: 'confirmed', confirmed_by: userId, confirmed_at: new Date().toISOString() }).eq('id', id)
    if (error) return { data: null, error: error.message }
    return await getOrderById(id)
  } catch (err) { const message = err instanceof Error ? err.message : 'Erreur confirmation'; return { data: null, error: message } }
}

export async function cancelOrder(id: UUID, userId: UUID, reason: string): Promise<{ data: Order | null; error: string | null }> {
  try {
    const { error } = await supabase.from('orders').update({ status: 'cancelled', cancelled_by: userId, cancelled_at: new Date().toISOString(), cancel_reason: reason }).eq('id', id)
    if (error) return { data: null, error: error.message }
    return await getOrderById(id)
  } catch (err) { const message = err instanceof Error ? err.message : 'Erreur annulation'; return { data: null, error: message } }
}

export async function recordDelivery(orderId: UUID, items: Array<{ item_id: UUID; quantity_delivered: number }>): Promise<{ data: Order | null; error: string | null }> {
  try {
    const updatePromises = items.map((item) => supabase.from('order_items').update({ quantity_delivered: item.quantity_delivered }).eq('id', item.item_id).eq('order_id', orderId))
    const updateResults = await Promise.all(updatePromises)
    const firstError = updateResults.find((r) => r.error)
    if (firstError?.error) return { data: null, error: `Erreur mise à jour : ${firstError.error.message}` }
    const { data: orderItems } = await supabase.from('order_items').select('*').eq('order_id', orderId)
    let newStatus: OrderStatus = 'partially_delivered'
    if (orderItems && orderItems.length > 0) {
      const someDelivered = orderItems.some((item) => item.quantity_delivered > 0)
      const allFullyDelivered = orderItems.every((item) => item.quantity_delivered >= item.quantity_ordered)
      if (allFullyDelivered && someDelivered) newStatus = 'delivered'
      else if (!someDelivered) newStatus = 'confirmed'
      else newStatus = 'partially_delivered'
    }
    const { error: statusError } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (statusError) return { data: null, error: statusError.message }
    return await getOrderById(orderId)
  } catch (err) { const message = err instanceof Error ? err.message : 'Erreur livraison'; return { data: null, error: message } }
}
