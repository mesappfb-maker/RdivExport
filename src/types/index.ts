// ─── RdivExport – Core Application Types ─────────────────────────────────────

import type { UUID } from './database'

// ─── Enums & Union Types ────────────────────────────────────────────────────

/** Rôles disponibles dans l'application */
export type Role = 'pharmacy_user' | 'main_requisitionist' | 'centralisateur' | 'depot_user'

/** Statuts possibles d'une réquisition */
export type RequisitionStatus =
  | 'draft'
  | 'pending'
  | 'validated'
  | 'delivered'
  | 'cancelled'

/** Statuts possibles d'une commande */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'partially_delivered'
  | 'delivered'
  | 'cancelled'

// ─── Pharmacy ──────────────────────────────────────────────────────────────

export interface Pharmacy {
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
}

// ─── Profile (Utilisateur) ─────────────────────────────────────────────────

export interface Profile {
  id: UUID
  full_name: string
  email: string
  phone?: string
  role: Role
  pharmacy_id?: UUID
  pharmacy?: Pharmacy
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Product (Médicament / Produit) ────────────────────────────────────────

export interface Product {
  id: UUID
  name: string
  description?: string
  code?: string
  main_depot_stock: number
  unit?: string
  category?: string
  min_stock_threshold?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── DepotCatalogItem (Produit du catalogue dépôt) ─────────────────────────

export interface DepotCatalogItem {
  id: UUID
  product_id: UUID
  product?: Product
  available_quantity: number
  unit_price: number | null
  is_available: boolean
  restock_date?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

// ─── Order (Commande) ──────────────────────────────────────────────────────

export interface Order {
  id: UUID
  reference_number: string
  pharmacy_id: UUID
  pharmacy?: Pharmacy
  status: OrderStatus
  total_amount: number
  comment?: string
  confirmed_by?: UUID
  confirmed_by_profile?: Profile
  confirmed_at?: string
  cancelled_by?: UUID
  cancelled_by_profile?: Profile
  cancelled_at?: string
  cancel_reason?: string
  created_by: UUID
  created_by_profile?: Profile
  items?: OrderItem[]
  created_at: string
  updated_at: string
}

// ─── OrderItem (Ligne de commande) ─────────────────────────────────────────

export interface OrderItem {
  id: UUID
  order_id: UUID
  product_id: UUID
  product?: Product
  quantity_ordered: number
  unit_price: number
  quantity_delivered: number
  comment?: string
  created_at: string
  updated_at: string
}

// ─── Requisition (Réquisition) ──────────────────────────────────────────────

export interface Requisition {
  id: UUID
  reference_number: string
  pharmacy_id: UUID
  pharmacy?: Pharmacy
  created_by: UUID
  created_by_profile?: Profile
  status: RequisitionStatus
  comment?: string
  validated_by?: UUID
  validated_by_profile?: Profile
  validated_at?: string
  delivered_by?: UUID
  delivered_by_profile?: Profile
  delivered_at?: string
  cancelled_by?: UUID
  cancelled_by_profile?: Profile
  cancelled_at?: string
  cancel_reason?: string
  items?: RequisitionItem[]
  created_at: string
  updated_at: string
}

// ─── RequisitionItem (Ligne de réquisition) ────────────────────────────────

export interface RequisitionItem {
  id: UUID
  requisition_id: UUID
  requisition?: Requisition
  product_id: UUID | null
  product?: Product
  product_name?: string
  quantity_requested: number
  quantity_delivered?: number
  created_at: string
}

// ─── DeliveryChecklist (Bordereau de livraison) ─────────────────────────────

export interface DeliveryChecklist {
  id: UUID
  requisition_id: UUID
  requisition?: Requisition
  delivered_by: UUID
  delivered_by_profile?: Profile
  notes?: string
  items_checked: boolean
  signed_at?: string
  created_at: string
  updated_at: string
}

// ─── AuditLog (Journal d'audit) ────────────────────────────────────────────

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'validate'
  | 'deliver'
  | 'cancel'
  | 'login'
  | 'logout'

export interface AuditLog {
  id: UUID
  user_id: UUID
  user?: Profile
  action: AuditAction
  entity_type: 'requisition' | 'requisition_item' | 'delivery_checklist' | 'product' | 'pharmacy' | 'profile'
  entity_id: UUID
  details?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at: string
}

// ─── Helper / DTO types ────────────────────────────────────────────────────

/** Données minimales pour créer une réquisition */
export interface CreateRequisitionInput {
  pharmacy_id: UUID | null
  status?: RequisitionStatus
  items: Array<{
    product_id: UUID | null
    product_name?: string
    quantity_requested: number
  }>
  comment?: string
}

/** Données pour mettre à jour le statut d'une réquisition */
export interface UpdateRequisitionStatusInput {
  status: RequisitionStatus
  cancel_reason?: string
}

/** Données minimales pour créer une commande */
export interface CreateOrderInput {
  pharmacy_id: UUID
  items: Array<{
    product_id: UUID
    quantity_ordered: number
    unit_price: number
    comment?: string
  }>
  comment?: string
}

/** Pagination params */
export interface PaginationParams {
  page: number
  itemsPerPage: number
}

/** Paginated response */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  itemsPerPage: number
  totalPages: number
}

/** Notification pour les pharmacies */
export interface Notification {
  id: UUID
  user_id: UUID
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  created_at: string
}
