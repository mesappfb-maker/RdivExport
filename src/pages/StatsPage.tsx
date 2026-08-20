// --- RdivExport - Page Statistiques Avancées --------------------------------
// Analyses approfondies, tendances, comparaisons de périodes,
// suggestions intelligentes et bonnes pratiques.

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminStats, type AdminStats } from '@/services/stats.service'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { KpiCard, StatSection, MiniBarChart, DonutChart, Sparkline, InsightCard, ProgressRing } from '@/components/StatsCharts'
import { BackButton } from '@/components/BackButton'
import type { Pharmacy, Product } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────

type TabKey = 'overview' | 'performance' | 'products' | 'practices'

interface PeriodComparison {
  label: string
  current: number
  previous: number
  change: number
}

interface PharmacyPerformance {
  pharmacyId: string
  pharmacyName: string
  totalReqs: number
  deliveredReqs: number
  deliveryRate: number
  lastActivity: string | null
  rank: number
}

interface ProductAnalysis {
  productId: string
  productName: string
  totalRequested: number
  requestCount: number
  avgPerRequest: number
  stockStatus: 'healthy' | 'low' | 'out' | 'unknown'
  currentStock: number
  trend: 'up' | 'down' | 'stable'
}

interface BestPractice {
  id: string
  category: 'efficiency' | 'stock' | 'communication' | 'process'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  bpStatus: 'applied' | 'partial' | 'not_applied'
  action?: string
  actionPath?: string
}

type ProductFilter = 'all' | 'out' | 'low' | 'up'

const STATUS_COLORS: Record<string, string> = {
  pending: '#eab308',
  consolidated: '#6366f1',
  validated: '#3b82f6',
  delivered: '#22c55e',
  cancelled: '#ef4444',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  consolidated: 'Consolidees',
  validated: 'Validees',
  delivered: 'Livrees',
  cancelled: 'Annulees',
}

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: "Vue d'ensemble" },
  { key: 'performance', label: 'Performance' },
  { key: 'products', label: 'Produits' },
  { key: 'practices', label: 'Bonnes pratiques' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Component ──────────────────────────────────────────────────────────

export default function StatsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [_pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [pharmacyPerf, setPharmacyPerf] = useState<PharmacyPerformance[]>([])
  const [productAnalysis, setProductAnalysis] = useState<ProductAnalysis[]>([])
  const [periodComparison, setPeriodComparison] = useState<PeriodComparison[]>([])
  const [bestPractices, setBestPractices] = useState<BestPractice[]>([])
  const [processingTimes, setProcessingTimes] = useState<{ status: string; avgDays: number; count: number }[]>([])
  const [productFilter, setProductFilter] = useState<ProductFilter>('all')

  const loadAllData = useCallback(async () => {
    try {
      const [adminStats, pharmRes, prodRes, reqRes, itemRes] = await Promise.all([
        getAdminStats(),
        supabase.from('pharmacies').select('*').eq('is_active', true),
        supabase.from('products').select('*').eq('is_active', true),
        supabase.from('requisitions').select('*').not('status', 'eq', 'draft').order('created_at', { ascending: false }),
        supabase.from('requisition_items').select('*'),
      ])

      setStats(adminStats)
      const pharms = (pharmRes.data ?? []) as Pharmacy[]
      const prods = (prodRes.data ?? []) as Product[]
      const reqs = (reqRes.data ?? []) as any[]
      const items = (itemRes.data ?? []) as any[]
      setPharmacies(pharms)

      // --- Period Comparison ---
      const now = new Date()
      const thisMonth = now.toISOString().slice(0, 7)
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonth = lastMonthDate.toISOString().slice(0, 7)
      const thisWeekStart = new Date(now)
      thisWeekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
      const thisWeekStartStr = thisWeekStart.toISOString().slice(0, 10)
      const lastWeekStart = new Date(thisWeekStart)
      lastWeekStart.setDate(lastWeekStart.getDate() - 7)
      const lastWeekEnd = thisWeekStartStr
      const lastWeekStartStr = lastWeekStart.toISOString().slice(0, 10)

      const thisMonthReqs = reqs.filter(r => getMonthKey(r.created_at) === thisMonth).length
      const lastMonthReqs = reqs.filter(r => getMonthKey(r.created_at) === lastMonth).length
      const thisWeekReqs = reqs.filter(r => r.created_at.slice(0, 10) >= thisWeekStartStr).length
      const lastWeekReqs = reqs.filter(r => {
        const d = r.created_at.slice(0, 10)
        return d >= lastWeekStartStr && d < lastWeekEnd
      }).length
      const thisMonthDelivered = reqs.filter(r => getMonthKey(r.created_at) === thisMonth && r.status === 'delivered').length
      const lastMonthDelivered = reqs.filter(r => getMonthKey(r.created_at) === lastMonth && r.status === 'delivered').length

      function pctChange(current: number, previous: number): number {
        if (previous === 0) return current > 0 ? 100 : 0
        return Math.round(((current - previous) / previous) * 100)
      }

      setPeriodComparison([
        { label: 'Requisitions ce mois', current: thisMonthReqs, previous: lastMonthReqs, change: pctChange(thisMonthReqs, lastMonthReqs) },
        { label: 'Requisitions cette semaine', current: thisWeekReqs, previous: lastWeekReqs, change: pctChange(thisWeekReqs, lastWeekReqs) },
        { label: 'Livraisons ce mois', current: thisMonthDelivered, previous: lastMonthDelivered, change: pctChange(thisMonthDelivered, lastMonthDelivered) },
        { label: 'Taux de livraison', current: adminStats.deliveryRate, previous: lastMonthReqs > 0 ? Math.round((lastMonthDelivered / lastMonthReqs) * 100) : 0, change: 0 },
      ])

      // --- Pharmacy Performance ---
      const pharmNameMap = new Map(pharms.map(p => [p.id, p.name]))
      const pharmReqMap = new Map<string, { total: number; delivered: number; lastActivity: string }>()
      for (const r of reqs) {
        const pid = r.pharmacy_id
        if (!pharmReqMap.has(pid)) {
          pharmReqMap.set(pid, { total: 0, delivered: 0, lastActivity: r.created_at })
        }
        const entry = pharmReqMap.get(pid)!
        entry.total++
        if (r.status === 'delivered') entry.delivered++
        if (r.created_at > entry.lastActivity) entry.lastActivity = r.created_at
      }
      const perfList: PharmacyPerformance[] = Array.from(pharmReqMap.entries())
        .map(([pharmacyId, data]) => ({
          pharmacyId,
          pharmacyName: pharmNameMap.get(pharmacyId) ?? 'Inconnue',
          totalReqs: data.total,
          deliveredReqs: data.delivered,
          deliveryRate: data.total > 0 ? Math.round((data.delivered / data.total) * 100) : 0,
          lastActivity: data.lastActivity,
          rank: 0,
        }))
        .sort((a, b) => b.deliveryRate - a.deliveryRate || b.totalReqs - a.totalReqs)
      perfList.forEach((p, i) => { p.rank = i + 1 })
      setPharmacyPerf(perfList)

      // --- Product Analysis ---
      const prodNameMap = new Map(prods.map(p => [p.id, p.name]))
      const prodStockMap = new Map(prods.map(p => [p.id, { stock: p.main_depot_stock, threshold: p.min_stock_threshold ?? 0 }]))
      const prodItemMap = new Map<string, { totalQty: number; count: number; byMonth: Map<string, number> }>()
      for (const item of items) {
        const pid = item.product_id ?? ''
        if (!prodItemMap.has(pid)) prodItemMap.set(pid, { totalQty: 0, count: 0, byMonth: new Map() })
        const entry = prodItemMap.get(pid)!
        entry.totalQty += item.quantity_requested ?? 0
        entry.count++
        const mk = getMonthKey(item.created_at ?? '')
        entry.byMonth.set(mk, (entry.byMonth.get(mk) ?? 0) + (item.quantity_requested ?? 0))
      }
      const prodAnalysisList: ProductAnalysis[] = Array.from(prodItemMap.entries())
        .map(([productId, data]) => {
          const stockInfo = prodStockMap.get(productId)
          const months = Array.from(data.byMonth.entries()).sort((a, b) => a[0].localeCompare(b[0]))
          const recentMonths = months.slice(-3)
          let trend: 'up' | 'down' | 'stable' = 'stable'
          if (recentMonths.length >= 2) {
            const first = recentMonths[0][1]
            const last = recentMonths[recentMonths.length - 1][1]
            if (last > first * 1.2) trend = 'up'
            else if (last < first * 0.8) trend = 'down'
          }
          let stockStatus: 'healthy' | 'low' | 'out' | 'unknown' = 'unknown'
          if (stockInfo) {
            if (stockInfo.stock === 0) stockStatus = 'out'
            else if (stockInfo.threshold > 0 && stockInfo.stock <= stockInfo.threshold) stockStatus = 'low'
            else stockStatus = 'healthy'
          }
          return {
            productId,
            productName: prodNameMap.get(productId) ?? 'Inconnu',
            totalRequested: data.totalQty,
            requestCount: data.count,
            avgPerRequest: data.count > 0 ? Math.round(data.totalQty / data.count) : 0,
            stockStatus,
            currentStock: stockInfo?.stock ?? 0,
            trend,
          }
        })
        .sort((a, b) => b.totalRequested - a.totalRequested)
      setProductAnalysis(prodAnalysisList)

      // --- Processing Times ---
      const deliveredTimes: number[] = []
      const validatedTimes: number[] = []
      for (const r of reqs) {
        if (r.status === 'delivered' && r.delivered_at && r.created_at) {
          deliveredTimes.push(daysBetween(r.created_at, r.delivered_at))
        }
        if ((r.status === 'validated' || r.status === 'delivered') && r.validated_at && r.created_at) {
          validatedTimes.push(daysBetween(r.created_at, r.validated_at))
        }
      }
      const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0
      setProcessingTimes([
        { status: 'Creation → Validation', avgDays: avg(validatedTimes), count: validatedTimes.length },
        { status: 'Creation → Livraison', avgDays: avg(deliveredTimes), count: deliveredTimes.length },
      ])

      // --- Best Practices ---
      const practices: BestPractice[] = []
      const deliveryRate = adminStats.deliveryRate
      const pendingCount = adminStats.byStatus['pending'] ?? 0
      const cancelledCount = adminStats.byStatus['cancelled'] ?? 0
      const totalNonDraft = reqs.length > 0 ? reqs.length : 1
      const cancellationRate = Math.round((cancelledCount / totalNonDraft) * 100)
      const avgDeliveryDays = avg(deliveredTimes)
      const outOfStockProds = prods.filter(p => p.main_depot_stock === 0).length
      const lowStockProds = prods.filter(p => p.min_stock_threshold != null && p.main_depot_stock > 0 && p.main_depot_stock <= p.min_stock_threshold).length
      const inactivePharms = pharms.filter(p => {
        const hasReq = reqs.some(r => r.pharmacy_id === p.id)
        return !hasReq
      }).length

      // Delivery rate
      if (deliveryRate >= 80) {
        practices.push({
          id: 'bp-delivery-excellent',
          category: 'efficiency',
          title: 'Taux de livraison excellent',
          description: `Le taux de livraison est de ${deliveryRate}%, ce qui est au-dessus du seuil recommande de 80%. Continuez sur cette lancee.`,
          impact: 'high',
          bpStatus: 'applied',
        })
      } else if (deliveryRate >= 50) {
        practices.push({
          id: 'bp-delivery-improve',
          category: 'efficiency',
          title: 'Taux de livraison a ameliorer',
          description: `Le taux de livraison est de ${deliveryRate}%. L'objectif est d'atteindre 80%. Identifiez les goulots d'etranglement dans le processus.`,
          impact: 'high',
          bpStatus: 'partial',
          action: 'Voir les requisitions en attente',
          actionPath: '/admin/consolidation',
        })
      } else {
        practices.push({
          id: 'bp-delivery-critical',
          category: 'efficiency',
          title: 'Taux de livraison critique',
          description: `Le taux de livraison n'est que de ${deliveryRate}%. Une action immediate est necessaire pour reorganiser le flux de livraison.`,
          impact: 'high',
          bpStatus: 'not_applied',
          action: 'Gerer les requisitions',
          actionPath: '/admin/consolidation',
        })
      }

      // Stock alerts
      if (outOfStockProds > 0) {
        practices.push({
          id: 'bp-stock-out',
          category: 'stock',
          title: `${outOfStockProds} produit(s) en rupture de stock`,
          description: `${outOfStockProds} produit(s) n'ont plus de stock en depot. Cela peut bloquer les livraisons et frustrer les pharmacies.`,
          impact: 'high',
          bpStatus: 'not_applied',
          action: 'Gerer le stock',
          actionPath: '/depot/stock',
        })
      }
      if (lowStockProds > 0) {
        practices.push({
          id: 'bp-stock-low',
          category: 'stock',
          title: `${lowStockProds} produit(s) avec stock bas`,
          description: `${lowStockProds} produit(s) sont en dessous du seuil minimum. Planifiez un reapprovisionnement anticipé.`,
          impact: 'medium',
          bpStatus: 'partial',
          action: 'Voir le stock depot',
          actionPath: '/depot/stock',
        })
      }
      if (outOfStockProds === 0 && lowStockProds === 0) {
        practices.push({
          id: 'bp-stock-healthy',
          category: 'stock',
          title: 'Niveaux de stock optimaux',
          description: 'Aucun produit en rupture ou en stock bas. La gestion des stocks est excellente.',
          impact: 'medium',
          bpStatus: 'applied',
        })
      }

      // Inactive pharmacies
      if (inactivePharms > 0) {
        practices.push({
          id: 'bp-inactive-pharm',
          category: 'communication',
          title: `${inactivePharms} pharmacie(s) inactive(s)`,
          description: `${inactivePharms} pharmacie(s) n'ont passe aucune requisition. Contactez-les pour comprendre les raisons et relancer l'activite.`,
          impact: 'medium',
          bpStatus: 'not_applied',
          action: 'Voir les pharmacies',
          actionPath: '/admin/pharmacies',
        })
      } else {
        practices.push({
          id: 'bp-all-active',
          category: 'communication',
          title: 'Toutes les pharmacies sont actives',
          description: 'Chaque pharmacie active a passe au moins une requisition. Bonne engagement de toutes les parties.',
          impact: 'low',
          bpStatus: 'applied',
        })
      }

      // Delivery time
      if (avgDeliveryDays > 0) {
        if (avgDeliveryDays <= 3) {
          practices.push({
            id: 'bp-delivery-fast',
            category: 'process',
            title: 'Delais de livraison rapides',
            description: `Le delai moyen de livraison est de ${avgDeliveryDays} jours, ce qui est excellent pour la satisfaction des pharmacies.`,
            impact: 'high',
            bpStatus: 'applied',
          })
        } else if (avgDeliveryDays <= 7) {
          practices.push({
            id: 'bp-delivery-acceptable',
            category: 'process',
            title: 'Delais de livraison acceptables',
            description: `Le delai moyen est de ${avgDeliveryDays} jours. Essayez de le reduire en dessous de 3 jours pour une meilleure reactivite.`,
            impact: 'medium',
            bpStatus: 'partial',
          })
        } else {
          practices.push({
            id: 'bp-delivery-slow',
            category: 'process',
            title: 'Delais de livraison trop longs',
            description: `Le delai moyen est de ${avgDeliveryDays} jours. Analysez le processus pour identifier les etapes lentes.`,
            impact: 'high',
            bpStatus: 'not_applied',
            action: 'Voir les livraisons',
            actionPath: '/admin/deliveries',
          })
        }
      }

      // Pending backlog
      if (pendingCount > 10) {
        practices.push({
          id: 'bp-backlog-high',
          category: 'process',
          title: `Arriéré important : ${pendingCount} en attente`,
          description: 'Il y a un nombre eleve de requisitions en attente de traitement. Priorisez la consolidation pour eviter les retards.',
          impact: 'high',
          bpStatus: 'not_applied',
          action: 'Consolider les requetes',
          actionPath: '/admin/consolidation',
        })
      } else if (pendingCount > 0) {
        practices.push({
          id: 'bp-backlow-low',
          category: 'process',
          title: `${pendingCount} requisition(s) en attente`,
          description: 'Un faible nombre de requisitions en attente. Traitez-les rapidement pour maintenir la fluidite.',
          impact: 'low',
          bpStatus: 'partial',
          action: 'Voir en attente',
          actionPath: '/admin/consolidation',
        })
      }

      // Ordering frequency
      const totalReqs = reqs.length
      const activeMonths = new Set(reqs.map(r => getMonthKey(r.created_at))).size || 1
      const avgReqsPerMonth = Math.round(totalReqs / activeMonths)
      practices.push({
        id: 'bp-frequency',
        category: 'process',
        title: `Frequence moyenne : ${avgReqsPerMonth} requisitions/mois`,
        description: avgReqsPerMonth >= 10
          ? 'La frequence de commande est bonne. Assurez-vous que les commandes sont bien planifiees.'
          : `Avec ${avgReqsPerMonth} requisitions par mois sur ${activeMonths} mois, la frequence est faible. Encouragez des commandes regulieres.`,
        impact: 'low',
        bpStatus: avgReqsPerMonth >= 10 ? 'applied' : 'partial',
      })

      // Monthly forecast
      if (adminStats.monthlyTrend.length >= 3) {
        const last3 = adminStats.monthlyTrend.slice(-3).map((m: { month: string; count: number }) => m.count)
        const forecast = Math.round(last3.reduce((a: number, b: number) => a + b, 0) / 3)
        practices.push({
          id: 'bp-forecast',
          category: 'stock',
          title: `Prevision mensuelle : ~${forecast} requisitions`,
          description: `Basee sur la moyenne des 3 derniers mois, attendez environ ${forecast} requisitions le mois prochain. Preparez le stock en consequence.`,
          impact: 'medium',
          bpStatus: forecast > 0 ? 'partial' : 'not_applied',
          action: 'Gerer le stock',
          actionPath: '/depot/stock',
        })
      }

      // Cancellation rate
      if (cancellationRate >= 20) {
        practices.push({
          id: 'bp-cancel-high',
          category: 'efficiency',
          title: `Taux d'annulation eleve : ${cancellationRate}%`,
          description: `${cancellationRate}% des requisitions sont annulees. Identifiez les causes frequentes pour reduire ce taux.`,
          impact: 'high',
          bpStatus: 'not_applied',
        })
      } else if (cancellationRate > 0) {
        practices.push({
          id: 'bp-cancel-low',
          category: 'efficiency',
          title: `Taux d'annulation : ${cancellationRate}%`,
          description: `Le taux d'annulation est de ${cancellationRate}%, ce qui est acceptable. Continuez a suivre les motifs d'annulation.`,
          impact: 'low',
          bpStatus: 'applied',
        })
      }

      setBestPractices(practices)
    } catch (err) {
      console.error('Failed to load stats data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  const handleRefresh = () => {
    setRefreshing(true)
    loadAllData()
  }

  // ─── Computed Values ───────────────────────────────────────────────────
  const deliveredCount = stats ? (stats.byStatus['delivered'] ?? 0) : 0
  const cancelledCount = stats ? (stats.byStatus['cancelled'] ?? 0) : 0

  const filteredProducts = productAnalysis.filter(p => {
    if (productFilter === 'all') return true
    if (productFilter === 'out') return p.stockStatus === 'out'
    if (productFilter === 'low') return p.stockStatus === 'low'
    if (productFilter === 'up') return p.trend === 'up'
    return true
  })

  const bpApplied = bestPractices.filter(bp => bp.bpStatus === 'applied').length
  const bpPartial = bestPractices.filter(bp => bp.bpStatus === 'partial').length
  const bpNotApplied = bestPractices.filter(bp => bp.bpStatus === 'not_applied').length

  const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    efficiency: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    stock: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    communication: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
    process: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }

  const IMPACT_COLORS: Record<string, string> = {
    high: 'border-l-red-500',
    medium: 'border-l-amber-500',
    low: 'border-l-blue-400',
  }

  const CATEGORY_COLORS: Record<string, string> = {
    efficiency: 'bg-blue-100 text-blue-600',
    stock: 'bg-amber-100 text-amber-600',
    communication: 'bg-purple-100 text-purple-600',
    process: 'bg-green-100 text-green-600',
  }

  // ─── Loading State ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner message="Chargement des statistiques..." size="lg" />
      </div>
    )
  }

  if (!stats) return null

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sticky Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Statistiques</h1>
              <p className="text-[11px] text-gray-400">Analyses et bonnes pratiques</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex h-9 min-h-[44px] w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
            aria-label="Rafraichir"
          >
            <svg className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
        </div>
        {/* Tab Bar */}
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 scrollbar-hide" aria-label="Onglets statistiques">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-24">
        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                label="Total requesitions"
                value={stats.totalRequisitions}
                color="blue"
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                }
              />
              <KpiCard
                label="Aujourd'hui"
                value={stats.todayRequisitions}
                color="green"
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <KpiCard
                label="Taux livraison"
                value={`${stats.deliveryRate}%`}
                color={stats.deliveryRate >= 80 ? 'green' : stats.deliveryRate >= 50 ? 'yellow' : 'red'}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-1.036-.84-1.875-1.875-1.875H19.5m-12.75 0H5.625c-.621 0-1.125.504-1.125 1.125v1.5c0 1.036.84 1.875 1.875 1.875h3.75" />
                  </svg>
                }
              />
              <KpiCard
                label="Stock bas"
                value={stats.lowStockCount}
                color={stats.lowStockCount > 0 ? 'red' : 'green'}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                }
              />
            </div>

            {/* Period Comparison */}
            <StatSection title="Comparaison de periodes" subtitle="Mois et semaine en cours vs precedents">
              <div className="grid grid-cols-2 gap-3">
                {periodComparison.map(pc => (
                  <div key={pc.label} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[11px] text-gray-500 truncate">{pc.label}</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-gray-900">{pc.current}</span>
                      <span className="text-[11px] text-gray-400">vs {pc.previous}</span>
                    </div>
                    <div className={`mt-1 text-xs font-semibold ${pc.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pc.change >= 0 ? '+' : ''}{pc.change}%
                    </div>
                  </div>
                ))}
              </div>
            </StatSection>

            {/* Donut Chart by Status */}
            <StatSection title="Repartition par statut">
              <DonutChart
                segments={Object.entries(stats.byStatus).map(([status, count]) => ({
                  label: STATUS_LABELS[status] ?? status,
                  value: count,
                  color: STATUS_COLORS[status] ?? '#9ca3af',
                }))}
                centerLabel="Total"
                centerValue={String(stats.totalRequisitions)}
                size={140}
              />
            </StatSection>

            {/* Weekly Sparkline */}
            <StatSection title="Tendance hebdomadaire" subtitle="8 dernieres semaines">
              <Sparkline
                data={stats.weeklyTrend.map(w => w.count)}
                labels={stats.weeklyTrend.map(w => w.week.slice(5))}
                color="#6366f1"
                showDots
                height={64}
              />
            </StatSection>

            {/* Monthly Sparkline */}
            <StatSection title="Tendance mensuelle" subtitle="6 derniers mois">
              <Sparkline
                data={stats.monthlyTrend.map(m => m.count)}
                labels={stats.monthlyTrend.map(m => m.month.slice(5))}
                color="#22c55e"
                showDots
                height={64}
              />
            </StatSection>

            {/* Top Products Bar Chart */}
            <StatSection title="Top produits demandes">
              <MiniBarChart
                data={stats.topProducts.slice(0, 6).map(p => ({
                  label: p.productName,
                  value: p.totalQty,
                }))}
                height={24}
              />
            </StatSection>

            {/* By Pharmacy Bar Chart */}
            <StatSection title="Requisitions par pharmacie">
              <MiniBarChart
                data={stats.byPharmacy.slice(0, 6).map(p => ({
                  label: p.pharmacyName,
                  value: p.total,
                }))}
                height={24}
              />
            </StatSection>

            {/* Meta Stats */}
            <StatSection title="Informations generales">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-lg font-bold text-gray-900">{stats.activePharmacies}</p>
                  <p className="text-[11px] text-gray-500">Pharmacies</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-lg font-bold text-gray-900">{stats.totalProducts}</p>
                  <p className="text-[11px] text-gray-500">Produits</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-lg font-bold text-gray-900">{stats.activeUsers}</p>
                  <p className="text-[11px] text-gray-500">Utilisateurs</p>
                </div>
              </div>
            </StatSection>
          </>
        )}

        {/* TAB: PERFORMANCE */}
        {activeTab === 'performance' && (
          <>
            {/* Performance Score */}
            <StatSection title="Score de performance" subtitle="Taux de livraison global">
              <div className="flex flex-col items-center py-4">
                <ProgressRing
                  value={stats.deliveryRate}
                  size={120}
                  strokeWidth={8}
                  color={stats.deliveryRate >= 80 ? '#22c55e' : stats.deliveryRate >= 50 ? '#eab308' : '#ef4444'}
                  label="Livraison"
                />
                <div className="mt-6 text-center">
                  <p className="text-sm font-semibold text-gray-900">
                    {stats.deliveryRate >= 80 ? 'Excellente performance' : stats.deliveryRate >= 50 ? 'Performance acceptable' : 'Performance a ameliorer'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {deliveredCount} livrees sur {stats.totalRequisitions} requesitions
                  </p>
                </div>
              </div>
            </StatSection>

            {/* Processing Times */}
            <StatSection title="Temps de traitement moyen">
              <div className="space-y-3">
                {processingTimes.map(pt => (
                  <div key={pt.status} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-900">{pt.status}</p>
                        <p className="text-[11px] text-gray-400">{pt.count} requesitions traitees</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{pt.avgDays}</p>
                      <p className="text-[11px] text-gray-400">jours</p>
                    </div>
                  </div>
                ))}
              </div>
            </StatSection>

            {/* Pharmacy Ranking */}
            <StatSection title="Classement des pharmacies" subtitle="Par taux de livraison">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {pharmacyPerf.map(pharm => {
                  const medalColor = pharm.rank === 1 ? 'bg-yellow-400 text-yellow-900' : pharm.rank === 2 ? 'bg-gray-300 text-gray-700' : pharm.rank === 3 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'
                  return (
                    <div
                      key={pharm.pharmacyId}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${medalColor}`}>
                          {pharm.rank}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">{pharm.pharmacyName}</p>
                          <p className="text-[11px] text-gray-400">
                            {pharm.totalReqs} requesitions
                            {pharm.lastActivity && ` · Derniere: ${formatDate(pharm.lastActivity)}`}
                          </p>
                        </div>
                      </div>
                      <div className={`flex-shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${
                        pharm.deliveryRate >= 80 ? 'bg-green-100 text-green-700' : pharm.deliveryRate >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {pharm.deliveryRate}%
                      </div>
                    </div>
                  )
                })}
                {pharmacyPerf.length === 0 && (
                  <p className="py-4 text-center text-xs text-gray-400">Aucune donnee disponible</p>
                )}
              </div>
            </StatSection>

            {/* Delivered vs Cancelled */}
            <StatSection title="Livrees vs Annulees">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{deliveredCount}</p>
                  <p className="text-xs text-green-600 mt-1">Livrees</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{cancelledCount}</p>
                  <p className="text-xs text-red-600 mt-1">Annulees</p>
                </div>
              </div>
              {stats.totalRequisitions > 0 && (
                <div className="mt-3">
                  <div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-green-500 transition-all duration-700"
                      style={{ width: `${(deliveredCount / stats.totalRequisitions) * 100}%` }}
                    />
                    <div
                      className="h-full bg-red-500 transition-all duration-700"
                      style={{ width: `${(cancelledCount / stats.totalRequisitions) * 100}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                    <span>{Math.round((deliveredCount / stats.totalRequisitions) * 100)}% livrees</span>
                    <span>{Math.round((cancelledCount / stats.totalRequisitions) * 100)}% annulees</span>
                  </div>
                </div>
              )}
            </StatSection>
          </>
        )}

        {/* TAB: PRODUCTS */}
        {activeTab === 'products' && (
          <>
            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {([['all', 'Tous'], ['out', 'En rupture'], ['low', 'Stock bas'], ['up', 'Tendance haussiere']] as Array<[ProductFilter, string]>).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setProductFilter(key)}
                  className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    productFilter === key
                      ? 'bg-gray-900 text-white'
                      : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                  {key === 'out' && productAnalysis.filter(p => p.stockStatus === 'out').length > 0 && (
                    <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {productAnalysis.filter(p => p.stockStatus === 'out').length}
                    </span>
                  )}
                  {key === 'low' && productAnalysis.filter(p => p.stockStatus === 'low').length > 0 && (
                    <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                      {productAnalysis.filter(p => p.stockStatus === 'low').length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Product Analysis Table */}
            <StatSection title="Analyse des produits" subtitle={`${filteredProducts.length} produit(s)`}>
              <div className="max-h-96 overflow-y-auto -mx-1">
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 border-b border-gray-100 px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  <span>Produit</span>
                  <span className="w-14 text-right">Total</span>
                  <span className="w-12 text-right">Reqs</span>
                  <span className="w-14 text-right">Moy/req</span>
                  <span className="w-20 text-right">Stock</span>
                </div>
                {/* Table Rows */}
                {filteredProducts.length === 0 ? (
                  <p className="py-8 text-center text-xs text-gray-400">Aucun produit ne correspond a ce filtre</p>
                ) : (
                  filteredProducts.map(product => {
                    const stockBadge =
                      product.stockStatus === 'out'
                        ? 'bg-red-100 text-red-700'
                        : product.stockStatus === 'low'
                        ? 'bg-amber-100 text-amber-700'
                        : product.stockStatus === 'healthy'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    const stockLabel =
                      product.stockStatus === 'out' ? 'Rupture' : product.stockStatus === 'low' ? 'Bas' : product.stockStatus === 'healthy' ? 'OK' : '?'
                    const trendIcon =
                      product.trend === 'up' ? (
                        <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                        </svg>
                      ) : product.trend === 'down' ? (
                        <svg className="h-3.5 w-3.5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                        </svg>
                      )
                    return (
                      <div
                        key={product.productId}
                        className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center border-b border-gray-50 px-2 py-2.5 text-xs hover:bg-gray-50 transition-colors"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          {trendIcon}
                          <span className="truncate font-medium text-gray-900">{product.productName}</span>
                        </div>
                        <span className="w-14 text-right font-semibold text-gray-700">{product.totalRequested}</span>
                        <span className="w-12 text-right text-gray-500">{product.requestCount}</span>
                        <span className="w-14 text-right text-gray-500">{product.avgPerRequest}</span>
                        <div className="w-20 flex justify-end">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${stockBadge}`}>
                            {stockLabel} ({product.currentStock})
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </StatSection>

            {/* Product Stats Summary */}
            <StatSection title="Resume produit">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">{productAnalysis.length}</p>
                  <p className="text-[11px] text-gray-500">Produits analyses</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">
                    {productAnalysis.length > 0
                      ? Math.round(productAnalysis.reduce((s, p) => s + p.totalRequested, 0) / productAnalysis.length)
                      : 0}
                  </p>
                  <p className="text-[11px] text-gray-500">Moy. totale demandee</p>
                </div>
                <div className="rounded-xl bg-red-50 p-3 text-center">
                  <p className="text-lg font-bold text-red-700">{productAnalysis.filter(p => p.stockStatus === 'out').length}</p>
                  <p className="text-[11px] text-red-600">En rupture</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3 text-center">
                  <p className="text-lg font-bold text-amber-700">{productAnalysis.filter(p => p.stockStatus === 'low').length}</p>
                  <p className="text-[11px] text-amber-600">Stock bas</p>
                </div>
              </div>
            </StatSection>
          </>
        )}

        {/* TAB: BEST PRACTICES */}
        {activeTab === 'practices' && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-center">
                <p className="text-xl font-bold text-green-700">{bpApplied}</p>
                <p className="text-[11px] text-green-600">Appliquees</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-xl font-bold text-amber-700">{bpPartial}</p>
                <p className="text-[11px] text-amber-600">Partielles</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
                <p className="text-xl font-bold text-red-700">{bpNotApplied}</p>
                <p className="text-[11px] text-red-600">A ameliorer</p>
              </div>
            </div>

            {/* Best Practice Cards */}
            <div className="space-y-3">
              {bestPractices.map(bp => {
                const statusBadge =
                  bp.bpStatus === 'applied'
                    ? 'bg-green-100 text-green-700'
                    : bp.bpStatus === 'partial'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
                const statusLabel =
                  bp.bpStatus === 'applied' ? 'Applique' : bp.bpStatus === 'partial' ? 'Partiel' : "A ameliorer"

                return (
                  <div
                    key={bp.id}
                    className={`rounded-xl border border-gray-200 border-l-4 ${IMPACT_COLORS[bp.impact]} bg-white p-4 shadow-sm`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Category Icon */}
                      <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${CATEGORY_COLORS[bp.category]}`}>
                        {CATEGORY_ICONS[bp.category]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900">{bp.title}</p>
                          <span className={`flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${statusBadge}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-gray-600">{bp.description}</p>
                        {bp.action && bp.actionPath && (
                          <button
                            onClick={() => navigate(bp.actionPath!)}
                            className="mt-2 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            {bp.action}
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {bestPractices.length === 0 && (
              <InsightCard
                type="info"
                title="Aucune bonne pratique"
                description="Les donnees sont insuffisantes pour generer des recommandations. Ajoutez plus de requesitions pour obtenir des suggestions."
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
