// ─── RdivExport – Constantes de l'application ───────────────────────────────

import type { RequisitionStatus, OrderStatus } from '@/types'

// ─── Application ───────────────────────────────────────────────────────────

/** Nom de l'application */
export const APP_NAME = 'RdivExport'

/** Version de l'application */
export const APP_VERSION = '1.0.0'

// ─── API & URLs ────────────────────────────────────────────────────────────

/** URL de base pour les liens WhatsApp */
export const WHATSAPP_BASE_URL = 'https://wa.me/'

// ─── Pagination ─────────────────────────────────────────────────────────────

/** Nombre d'éléments par page (pagination) */
export const ITEMS_PER_PAGE = 20

/** Options de pagination disponibles */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

// ─── Statuts Réquisition – Étiquettes en français ──────────────────────────

/** Map des statuts vers leur libellé en français */
export const STATUS_LABELS: Record<RequisitionStatus, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  validated: 'Validée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
}

// ─── Statuts Réquisition – Couleurs Tailwind ───────────────────────────────

/** Map des statuts vers les classes de couleur (badge) */
export const STATUS_COLORS: Record<RequisitionStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  validated: 'bg-blue-100 text-blue-700 border-blue-300',
  delivered: 'bg-green-100 text-green-700 border-green-300',
  cancelled: 'bg-red-100 text-red-700 border-red-300',
}

/** Map des statuts vers les classes de couleur (point indicateur) */
export const STATUS_DOT_COLORS: Record<RequisitionStatus, string> = {
  draft: 'bg-gray-400',
  pending: 'bg-yellow-400',
  validated: 'bg-blue-400',
  delivered: 'bg-green-400',
  cancelled: 'bg-red-400',
}

/** Map des statuts vers la couleur de texte brute */
export const STATUS_TEXT_COLORS: Record<RequisitionStatus, string> = {
  draft: 'text-gray-600',
  pending: 'text-yellow-600',
  validated: 'text-blue-600',
  delivered: 'text-green-600',
  cancelled: 'text-red-600',
}

// ─── Statuts Commande – Étiquettes en français ────────────────────────────

/** Map des statuts de commande vers leur libellé */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  partially_delivered: 'Livraison partielle',
  delivered: 'Livrée',
  cancelled: 'Annulée',
}

/** Map des statuts de commande vers les classes de couleur (badge) */
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-300',
  partially_delivered: 'bg-orange-100 text-orange-700 border-orange-300',
  delivered: 'bg-green-100 text-green-700 border-green-300',
  cancelled: 'bg-red-100 text-red-700 border-red-300',
}

// ─── Rôles ──────────────────────────────────────────────────────────────────

export const ROLE_LABELS = {
  pharmacy_user: 'Pharmacien',
  main_requisitionist: 'Réquisitionniste principal',
} as const

// ─── Stock ──────────────────────────────────────────────────────────────────

/** Seuil par défaut d'alerte stock bas */
export const DEFAULT_LOW_STOCK_THRESHOLD = 50

// ─── Stockage local ────────────────────────────────────────────────────────

/** Clé de stockage local pour les produits (cache) */
export const LOCAL_STORAGE_PRODUCTS_KEY = 'rdivexport_products_cache'

/** Clé de stockage local pour les filtres */
export const LOCAL_STORAGE_FILTERS_KEY = 'rdivexport_filters'

/** Durée de vie du cache produits (en ms) – 24 heures */
export const PRODUCTS_CACHE_TTL = 24 * 60 * 60 * 1000

// ─── Formats de référence ──────────────────────────────────────────────────

/** Préfixe pour les numéros de référence */
export const REQUISITION_PREFIX = 'REQ'

/** Masque pour les numéros de référence */
export const REQUISITION_REFERENCE_FORMAT = 'REQ-YYYYMMDD-XXXX'

/** Préfixe pour les numéros de commande */
export const ORDER_PREFIX = 'CMD'
