// --- RdivExport - Delivery Checklist Hook -----------------------------------
// Gestion du bordereau de livraison : chargement, mise a jour des quantites,
// basculement des coches, et soumission finale.

import { useState, useCallback } from 'react'
import type { Requisition } from '@/types'
import type { UUID } from '@/types/database'
import {
  getRequisitionById,
  updateDeliveryChecklist,
} from '@/services/requisitions.service'
import type { DeliveryChecklistItem } from '@/services/requisitions.service'

// --- Types ------------------------------------------------------------------

export interface ChecklistItemState {
  item_id: UUID
  product_name: string
  quantity_requested: number
  quantity_delivered: number
  checked: boolean
}

interface UseDeliveryChecklistReturn {
  requisition: Requisition | null
  checklistItems: ChecklistItemState[]
  loading: boolean
  error: string | null
  fetchChecklist: (requisitionId: UUID) => Promise<void>
  updateItemDelivery: (itemId: UUID, quantityDelivered: number, checked: boolean) => void
  toggleItemCheck: (itemId: UUID) => void
  submitChecklist: (requisitionId: UUID, deliveredBy: UUID) => Promise<Requisition | null>
}

// --- Hook -------------------------------------------------------------------

export function useDeliveryChecklist(): UseDeliveryChecklistReturn {
  const [requisition, setRequisition] = useState<Requisition | null>(null)
  const [checklistItems, setChecklistItems] = useState<ChecklistItemState[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchChecklist = useCallback(async (requisitionId: UUID) => {
    setLoading(true)
    setError(null)

    const result = await getRequisitionById(requisitionId)

    if (result.error || !result.data) {
      setError(result.error ?? 'Requisition introuvable')
      setRequisition(null)
      setChecklistItems([])
      setLoading(false)
      return
    }

    setRequisition(result.data)

    // Build checklist state from requisition items
    const items: ChecklistItemState[] = (result.data.items ?? []).map((item) => ({
      item_id: item.id,
      product_name: item.product?.name ?? item.product_name ?? 'Produit inconnu',
      quantity_requested: item.quantity_requested,
      quantity_delivered: item.quantity_delivered ?? 0,
      checked: (item.quantity_delivered ?? 0) > 0,
    }))

    setChecklistItems(items)
    setLoading(false)
  }, [])

  const updateItemDelivery = useCallback(
    (itemId: UUID, quantityDelivered: number, checked: boolean) => {
      setChecklistItems((prev) =>
        prev.map((item) =>
          item.item_id === itemId
            ? { ...item, quantity_delivered: quantityDelivered, checked }
            : item
        )
      )
    },
    []
  )

  const toggleItemCheck = useCallback((itemId: UUID) => {
    setChecklistItems((prev) =>
      prev.map((item) => {
        if (item.item_id !== itemId) return item
        const newChecked = !item.checked
        return {
          ...item,
          checked: newChecked,
          // When unchecking, reset delivered quantity to 0
          quantity_delivered: newChecked ? item.quantity_requested : 0,
        }
      })
    )
  }, [])

  const submitChecklist = useCallback(
    async (requisitionId: UUID, deliveredBy: UUID): Promise<Requisition | null> => {
      setLoading(true)
      setError(null)

      // Validate at least one item is checked
      const checkedItems = checklistItems.filter((item) => item.checked)
      if (checkedItems.length === 0) {
        setError('Veuillez cocher au moins un article')
        setLoading(false)
        return null
      }

      const deliveryItems: DeliveryChecklistItem[] = checklistItems.map((item) => ({
        item_id: item.item_id,
        quantity_delivered: item.checked ? item.quantity_delivered : 0,
        checked: item.checked,
      }))

      const result = await updateDeliveryChecklist(requisitionId, deliveryItems, deliveredBy)

      if (result.error || !result.data) {
        setError(result.error ?? 'Erreur lors de la soumission du bordereau')
        setLoading(false)
        return null
      }

      setRequisition(result.data)
      setLoading(false)
      return result.data
    },
    [checklistItems]
  )

  return {
    requisition,
    checklistItems,
    loading,
    error,
    fetchChecklist,
    updateItemDelivery,
    toggleItemCheck,
    submitChecklist,
  }
}
