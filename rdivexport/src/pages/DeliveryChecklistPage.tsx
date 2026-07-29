// --- RdivExport - Delivery Checklist Page -------------------------------------
// Bordereau de livraison pour une requisition : coches et quantites livrees.

import { useEffect, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useDeliveryChecklist } from '@/hooks/useDeliveryChecklist'
import { BackButton } from '@/components/BackButton'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { formatQuantity } from '@/utils/formatters'

export default function DeliveryChecklistPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state: authState } = useAuth()
  const profile = authState.profile

  const {
    requisition,
    checklistItems,
    loading,
    error,
    fetchChecklist,
    updateItemDelivery,
    toggleItemCheck,
    submitChecklist,
  } = useDeliveryChecklist()

  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (id) fetchChecklist(id)
  }, [id, fetchChecklist])

  const handleQuantityChange = useCallback(
    (itemId: string, value: string) => {
      const num = parseInt(value.replace(/\D/g, ''), 10)
      if (!isNaN(num) && num >= 0) {
        const item = checklistItems.find((i) => i.item_id === itemId)
        updateItemDelivery(itemId, num, item?.checked ?? false)
      }
    },
    [checklistItems, updateItemDelivery]
  )

  const handleSubmit = useCallback(async () => {
    if (!id || !profile) return
    const result = await submitChecklist(id, profile.user_id)
    if (result) setSuccess(true)
  }, [id, profile, submitChecklist])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <LoadingSpinner size="lg" message="Chargement du bordereau..." />
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-green-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-bold text-gray-900">Livraison validee</h2>
          <p className="mb-6 text-sm text-gray-600">Le bordereau de livraison a ete enregistre.</p>
          <button
            onClick={() => navigate(-1)}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Retour
          </button>
        </div>
      </div>
    )
  }

  if (!requisition) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <p className="mb-4 text-sm text-gray-500">{error ?? 'Requisition introuvable.'}</p>
        <BackButton />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <BackButton />
          <h1 className="text-lg font-bold text-gray-900">Bordereau de livraison</h1>
          <div className="w-16" />
        </div>
      </div>
      <div className="mx-auto max-w-lg px-4 py-4">
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-gray-900">{requisition.reference_number}</p>
          <p className="text-sm text-gray-600">{requisition.pharmacy?.name ?? 'Pharmacie inconnue'}</p>
        </div>
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Articles ({checklistItems.length})
        </h2>
        <div className="space-y-2">
          {checklistItems.map((item) => (
            <div
              key={item.item_id}
              className={`rounded-xl border bg-white p-3 shadow-sm transition-colors ${
                item.checked ? 'border-green-300 bg-green-50/50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleItemCheck(item.item_id)}
                  className="mt-1 h-6 w-6 flex-shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                  <p className="text-xs text-gray-500">
                    Demande : {formatQuantity(item.quantity_requested)}
                  </p>
                </div>
              </div>
              {item.checked && (
                <div className="mt-2 ml-9">
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Quantite livree
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={item.quantity_requested}
                    value={item.quantity_delivered || ''}
                    onChange={(e) => handleQuantityChange(item.item_id, e.target.value)}
                    inputMode="numeric"
                    className="h-11 w-24 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-green-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 active:bg-green-800"
        >
          {loading ? <LoadingSpinner size="sm" /> : 'Valider la livraison'}
        </button>
      </div>
    </div>
  )
}
