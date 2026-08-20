// ─── RdivExport – Service Statistiques ─────────────────────────────────────
// Calculs et agrégations pour les tableaux de bord.

import { supabase } from '@/lib/supabase'
import type { UUID } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalRequisitions: number
  todayRequisitions: number
  weekRequisitions: number
  monthRequisitions: number
  byStatus: Record<string, number>
  byPharmacy: Array<{ pharmacyId: string; pharmacyName: string; total: number; pending: number; delivered: number }>
  topProducts: Array<{ productId: string; productName: string; totalQty: number; requestCount: number }>
  avgItemsPerRequisition: number
  deliveryRate: number // percentage
  weeklyTrend: Array<{ week: string; count: number }>
  monthlyTrend: Array<{ month: string; count: number }>
  totalProducts: number
  lowStockCount: number
  activePharmacies: number
  activeUsers: number
}

export interface PharmacyStats {
  totalRequisitions: number
  pendingCount: number
  deliveredCount: number
  draftCount: number
  totalItems: number
  topProducts: Array<{ productId: string; productName: string; totalQty: number; frequency: number }>
  monthlyTrend: Array<{ month: string; count: number }>
  avgItemsPerRequisition: number
  lastRequisitionDate: string | null
  frequentProducts: Array<{ productId: string; productName: string; count: number }>
}

export interface CentralisateurStats {
  totalRequisitions: number
  pendingCount: number
  consolidatedCount: number
  validatedCount: number
  deliveredCount: number
  avgProcessingDays: number
  byPharmacy: Array<{ pharmacyId: string; pharmacyName: string; total: number; pending: number }>
  weeklyTrend: Array<{ week: string; count: number }>
}

export interface DepotStats {
  totalProducts: number
  lowStockProducts: Array<{ id: string; name: string; stock: number; threshold: number; unit?: string }>
  outOfStock: number
  totalStockValue: number
  mostRequested: Array<{ productId: string; productName: string; totalRequested: number; unit?: string }>
  categories: Array<{ name: string; count: number }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7) // YYYY-MM
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr)
  return getWeekStart(d)
}

function daysBetween(a: string, b: string): number {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
}

// ─── Admin Stats ──────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const [reqRes, itemRes, productRes, pharmRes, userRes] = await Promise.all([
    supabase.from('requisitions').select('*, pharmacies(name)').ne('status', 'draft').order('created_at', { ascending: false }),
    supabase.from('requisition_items').select('product_id, quantity_requested, products(name)'),
    supabase.from('products').select('id, name, main_depot_stock, min_stock_threshold, is_active'),
    supabase.from('pharmacies').select('id, name, is_active'),
    supabase.from('profiles').select('id, is_active'),
  ])

  const reqs = (reqRes.data ?? []) as any[]
  const items = (itemRes.data ?? []) as any[]
  const products = (productRes.data ?? []) as any[]
  const pharmacies = (pharmRes.data ?? []) as any[]
  const users = (userRes.data ?? []) as any[]

  // By status
  const byStatus: Record<string, number> = {}
  for (const r of reqs) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1
  }

  // By pharmacy
  const pharmMap = new Map<string, { total: number; pending: number; delivered: number }>()
  for (const r of reqs) {
    const pid = r.pharmacy_id
    if (!pharmMap.has(pid)) pharmMap.set(pid, { total: 0, pending: 0, delivered: 0 })
    const entry = pharmMap.get(pid)!
    entry.total++
    if (r.status === 'pending') entry.pending++
    if (r.status === 'delivered') entry.delivered++
  }
  const pharmNameMap = new Map(pharmacies.map(p => [p.id, p.name]))
  const byPharmacy = Array.from(pharmMap.entries()).map(([pharmacyId, counts]) => ({
    pharmacyId,
    pharmacyName: pharmNameMap.get(pharmacyId) ?? 'Inconnue',
    ...counts,
  })).sort((a, b) => b.total - a.total)

  // Top products
  const prodMap = new Map<string, { name: string; totalQty: number; requestCount: number }>()
  const prodNameMap = new Map(products.map(p => [p.id, p.name]))
  for (const item of items) {
    const pid = item.product_id ?? ''
    if (!prodMap.has(pid)) prodMap.set(pid, { name: item.products?.name ?? prodNameMap.get(pid) ?? 'Inconnu', totalQty: 0, requestCount: 0 })
    const entry = prodMap.get(pid)!
    entry.totalQty += item.quantity_requested ?? 0
    entry.requestCount++
  }
  const topProducts = Array.from(prodMap.entries())
    .map(([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, 10)

  // Weekly trend (last 8 weeks)
  const weekMap = new Map<string, number>()
  for (let i = 7; i >= 0; i--) {
    const d = new Date(Date.now() - i * 7 * 86400000)
    weekMap.set(getWeekStart(d), 0)
  }
  for (const r of reqs) {
    const wk = getWeekKey(r.created_at)
    if (weekMap.has(wk)) weekMap.set(wk, (weekMap.get(wk) ?? 0) + 1)
  }
  const weeklyTrend = Array.from(weekMap.entries()).map(([week, count]) => ({ week, count }))

  // Monthly trend (last 6 months)
  const monthMap = new Map<string, number>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    monthMap.set(getMonthKey(d.toISOString()), 0)
  }
  for (const r of reqs) {
    const mk = getMonthKey(r.created_at)
    if (monthMap.has(mk)) monthMap.set(mk, (monthMap.get(mk) ?? 0) + 1)
  }
  const monthlyTrend = Array.from(monthMap.entries()).map(([month, count]) => ({ month, count }))

  // Delivery rate
  const delivered = byStatus['delivered'] || 0
  const nonCancelled = reqs.filter(r => r.status !== 'cancelled').length
  const deliveryRate = nonCancelled > 0 ? Math.round((delivered / nonCancelled) * 100) : 0

  // Low stock
  const lowStockCount = products.filter(p => 
    p.is_active && p.min_stock_threshold != null && p.main_depot_stock <= p.min_stock_threshold
  ).length

  return {
    totalRequisitions: reqs.length,
    todayRequisitions: reqs.filter(r => r.created_at.slice(0, 10) === today).length,
    weekRequisitions: reqs.filter(r => r.created_at.slice(0, 10) >= weekAgo).length,
    monthRequisitions: reqs.filter(r => r.created_at.slice(0, 10) >= monthAgo).length,
    byStatus,
    byPharmacy,
    topProducts,
    avgItemsPerRequisition: reqs.length > 0 ? Math.round(items.length / reqs.length) : 0,
    deliveryRate,
    weeklyTrend,
    monthlyTrend,
    totalProducts: products.filter(p => p.is_active).length,
    lowStockCount,
    activePharmacies: pharmacies.filter(p => p.is_active).length,
    activeUsers: users.filter(u => u.is_active).length,
  }
}

// ─── Pharmacy Stats ───────────────────────────────────────────────────────

export async function getPharmacyStats(pharmacyId: UUID): Promise<PharmacyStats> {
  const [reqRes, itemRes] = await Promise.all([
    supabase.from('requisitions').select('*').eq('pharmacy_id', pharmacyId).order('created_at', { ascending: false }),
    supabase.from('requisition_items').select('product_id, product_name, quantity_requested, products(name, id)').eq('requisition_id',
      // Subquery for requisition IDs of this pharmacy
      `(SELECT id FROM requisitions WHERE pharmacy_id = '${pharmacyId}')`
    ).is('requisition_id', null), // Fallback: load items separately
  ])

  const reqs = (reqRes.data ?? []) as any[]

  // Load items for this pharmacy's requisitions
  const reqIds = reqs.map(r => r.id)
  let items: any[] = []
  if (reqIds.length > 0) {
    const { data } = await supabase
      .from('requisition_items')
      .select('product_id, product_name, quantity_requested, products(name, id)')
      .in('requisition_id', reqIds)
    items = data ?? []
  }

  // Top products by quantity
  const prodMap = new Map<string, { productId: string; productName: string; totalQty: number; frequency: number }>()
  for (const item of items) {
    const pid = item.product_id ?? 'manual'
    const pName = item.products?.name ?? item.product_name ?? 'Produit'
    if (!prodMap.has(pid)) prodMap.set(pid, { productId: pid, productName: pName, totalQty: 0, frequency: 0 })
    const entry = prodMap.get(pid)!
    entry.totalQty += item.quantity_requested ?? 0
    entry.frequency++
  }
  const topProducts = Array.from(prodMap.values())
    .sort((a, b) => b.frequency - a.frequency)
  .slice(0, 5)

  // Frequent products (for suggestions) — ordered by frequency
  const frequentProducts = Array.from(prodMap.values())
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 8)

  // Monthly trend
  const monthMap = new Map<string, number>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    monthMap.set(getMonthKey(d.toISOString()), 0)
  }
  for (const r of reqs) {
    if (r.status === 'draft') continue
    const mk = getMonthKey(r.created_at)
    if (monthMap.has(mk)) monthMap.set(mk, (monthMap.get(mk) ?? 0) + 1)
  }
  const monthlyTrend = Array.from(monthMap.entries()).map(([month, count]) => ({ month, count }))

  const nonDraftReqs = reqs.filter(r => r.status !== 'draft')

  return {
    totalRequisitions: nonDraftReqs.length,
    pendingCount: reqs.filter(r => r.status === 'pending').length,
    deliveredCount: reqs.filter(r => r.status === 'delivered').length,
    draftCount: reqs.filter(r => r.status === 'draft').length,
    totalItems: items.length,
    topProducts,
    monthlyTrend,
    avgItemsPerRequisition: nonDraftReqs.length > 0 ? Math.round(items.length / nonDraftReqs.length) : 0,
    lastRequisitionDate: nonDraftReqs.length > 0 ? nonDraftReqs[0].created_at : null,
    frequentProducts,
  }
}

// ─── Centralisateur Stats ─────────────────────────────────────────────────

export async function getCentralisateurStats(): Promise<CentralisateurStats> {
  const [reqRes, pharmRes] = await Promise.all([
    supabase.from('requisitions').select('*, pharmacies(name)').ne('status', 'draft').order('created_at', { ascending: false }),
    supabase.from('pharmacies').select('id, name').eq('is_active', true),
  ])

  const reqs = (reqRes.data ?? []) as any[]
  const pharmacies = (pharmRes.data ?? []) as any[]

  // Processing time (pending → delivered)
  const processingTimes: number[] = []
  for (const r of reqs) {
    if (r.status === 'delivered' && r.delivered_at && r.created_at) {
      processingTimes.push(daysBetween(r.created_at, r.delivered_at))
    }
  }
  const avgProcessingDays = processingTimes.length > 0
    ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length * 10) / 10
    : 0

  // By pharmacy
  const pharmMap = new Map<string, { total: number; pending: number }>()
  const pharmNameMap = new Map(pharmacies.map(p => [p.id, p.name]))
  for (const r of reqs) {
    const pid = r.pharmacy_id
    if (!pharmMap.has(pid)) pharmMap.set(pid, { total: 0, pending: 0 })
    const entry = pharmMap.get(pid)!
    entry.total++
    if (r.status === 'pending') entry.pending++
  }
  const byPharmacy = Array.from(pharmMap.entries()).map(([pharmacyId, counts]) => ({
    pharmacyId,
    pharmacyName: pharmNameMap.get(pharmacyId) ?? 'Inconnue',
    ...counts,
  })).sort((a, b) => b.total - a.total)

  // Weekly trend
  const weekMap = new Map<string, number>()
  for (let i = 7; i >= 0; i--) {
    const d = new Date(Date.now() - i * 7 * 86400000)
    weekMap.set(getWeekStart(d), 0)
  }
  for (const r of reqs) {
    const wk = getWeekKey(r.created_at)
    if (weekMap.has(wk)) weekMap.set(wk, (weekMap.get(wk) ?? 0) + 1)
  }
  const weeklyTrend = Array.from(weekMap.entries()).map(([week, count]) => ({ week, count }))

  return {
    totalRequisitions: reqs.length,
    pendingCount: reqs.filter(r => r.status === 'pending').length,
    consolidatedCount: reqs.filter(r => r.status === 'consolidated').length,
    validatedCount: reqs.filter(r => r.status === 'validated').length,
    deliveredCount: reqs.filter(r => r.status === 'delivered').length,
    avgProcessingDays,
    byPharmacy,
    weeklyTrend,
  }
}

// ─── Depot Stats ──────────────────────────────────────────────────────────

export async function getDepotStats(): Promise<DepotStats> {
  const [prodRes, itemRes] = await Promise.all([
    supabase.from('products').select('*').order('name'),
    supabase.from('requisition_items').select('product_id, quantity_requested, products(name, unit)'),
  ])

  const products = (prodRes.data ?? []) as any[]
  const items = (itemRes.data ?? []) as any[]

  const activeProducts = products.filter(p => p.is_active)

  // Low stock
  const lowStockProducts = activeProducts
    .filter(p => p.min_stock_threshold != null && p.main_depot_stock <= p.min_stock_threshold)
    .sort((a, b) => a.main_depot_stock - b.main_depot_stock)
    .map(p => ({
      id: p.id,
      name: p.name,
      stock: p.main_depot_stock,
      threshold: p.min_stock_threshold,
      unit: p.unit,
    }))

  const outOfStock = activeProducts.filter(p => p.main_depot_stock === 0).length

  // Most requested products
  const reqMap = new Map<string, { productName: string; totalRequested: number; unit?: string }>()
  for (const item of items) {
    const pid = item.product_id ?? ''
    if (!reqMap.has(pid)) reqMap.set(pid, { productName: item.products?.name ?? 'Inconnu', totalRequested: 0, unit: item.products?.unit })
    reqMap.get(pid)!.totalRequested += item.quantity_requested ?? 0
  }
  const mostRequested = Array.from(reqMap.entries())
    .map(([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.totalRequested - a.totalRequested)
    .slice(0, 10)

  // Categories
  const catMap = new Map<string, number>()
  for (const p of activeProducts) {
    const cat = p.category || 'Non classé'
    catMap.set(cat, (catMap.get(cat) ?? 0) + 1)
  }
  const categories = Array.from(catMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return {
    totalProducts: activeProducts.length,
    lowStockProducts,
    outOfStock,
    totalStockValue: activeProducts.reduce((s, p) => s + (p.main_depot_stock || 0), 0),
    mostRequested,
    categories,
  }
}

// ─── Suggestions for pharmacy (products they order frequently) ────────────

export async function getPharmacySuggestions(pharmacyId: UUID): Promise<Array<{
  product_id: string
  product_name: string
  frequency: number
  lastOrdered: string
  unit?: string
  avgQty: number
}>> {
  // Get items from this pharmacy's past requisitions
  const { data: reqs } = await supabase
    .from('requisitions')
    .select('id, created_at')
    .eq('pharmacy_id', pharmacyId)
    .ne('status', 'draft')
    .order('created_at', { ascending: false })

  if (!reqs || reqs.length === 0) return []

  const reqIds = reqs.map(r => r.id)
  const { data: items } = await supabase
    .from('requisition_items')
    .select('product_id, product_name, quantity_requested, created_at, products(name, unit)')
    .in('requisition_id', reqIds)

  if (!items || items.length === 0) return []

  // Aggregate by product
  const prodMap = new Map<string, { product_name: string; frequency: number; lastOrdered: string; totalQty: number; unit?: string }>()
  for (const item of items) {
    const pid = item.product_id ?? 'manual'
    if (!prodMap.has(pid)) {
      prodMap.set(pid, {
        product_name: item.products?.name ?? item.product_name ?? 'Produit',
        frequency: 0, lastOrdered: '', totalQty: 0, unit: item.products?.unit,
      })
    }
    const entry = prodMap.get(pid)!
    entry.frequency++
    entry.totalQty += item.quantity_requested ?? 0
    if (item.created_at > entry.lastOrdered) entry.lastOrdered = item.created_at
  }

  return Array.from(prodMap.entries())
    .map(([product_id, data]) => ({
      product_id,
      ...data,
      avgQty: Math.round(data.totalQty / data.frequency),
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10)
}
