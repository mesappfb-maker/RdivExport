// ─── RdivExport – Ligne d'élément de réquisition ─────────────────────────────
// Affiche une seule ligne produit dans le formulaire de création de réquisition.
// Permet la modification de la quantité et la suppression de l'élément.

import { useCallback } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface RequisitionItemData {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit?: string
}

interface RequisitionItemRowProps {
  item: RequisitionItemData
  index: number
  onQuantityChange: (index: number, quantity: number) => void
  onRemove: (index: number) => void
}

// ─── Composant ──────────────────────────────────────────────────────────────

export function RequisitionItemRow({
  item,
  index,
  onQuantityChange,
  onRemove,
}: RequisitionItemRowProps) {
  const handleQuantityInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, '')
      const value = parseInt(rawValue, 10)
      if (!isNaN(value) && value >= 1) {
        onQuantityChange(index, value)
      } else if (e.target.value === '') {
        // Allow empty input for editing
        onQuantityChange(index, 0)
      }
    },
    [index, onQuantityChange],
  )

  const handleBlur = useCallback(() => {
    // Ensure quantity is at least 1 on blur
    if (item.quantity < 1) {
      onQuantityChange(index, 1)
    }
  }, [item.quantity, index, onQuantityChange])

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      {/* Numéro de ligne */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
        {index + 1}
      </div>

      {/* Nom du produit + unité */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {item.product_name}
        </p>
        {item.unit && (
          <p className="text-xs text-gray-500">{item.unit}</p>
        )}
      </div>

      {/* Input quantité */}
      <div className="flex flex-shrink-0 items-center gap-1">
        <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50">
          <input
            type="number"
            min={1}
            value={item.quantity || ''}
            onChange={handleQuantityInput}
            onBlur={handleBlur}
            className="h-11 min-h-[44px] w-14 bg-transparent text-center text-sm font-medium text-gray-900 focus:outline-none"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={`Quantité pour ${item.product_name}`}
          />
        </div>

        {/* Bouton supprimer */}
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="flex h-11 min-h-[44px] w-11 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          aria-label={`Supprimer ${item.product_name}`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
  )
}
