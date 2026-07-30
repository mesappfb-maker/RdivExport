// --- RdivExport - Create Requisition Page -------------------------------------
// Formulaire de création de réquisition : recherche de produits, quantités,
// commentaire, envoi via WhatsApp ou enregistrement brouillon.

import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRequisitions } from '@/hooks/useRequisitions'
import { SearchBar } from '@/components/SearchBar'
import { RequisitionItemRow } from '@/components/RequisitionItemRow'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { BackButton } from '@/components/BackButton'
import { formatWhatsAppMessage, generateWhatsAppLink } from '@/utils/formatters'
import { getWhatsAppNumber } from '@/services/settings.service'
import { supabase } from '@/lib/supabase'
import type { Product, Requisition } from '@/types'

// --- Types locaux ------------------------------------------------------------

interface SelectedItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit?: string
}

// --- Composant ----------------------------------------------------------------

export default function CreateRequisitionPage() {
  const navigate = useNavigate()
  const { state: authState } = useAuth()
  const profile = authState.profile
  const pharmacyId = profile?.pharmacy_id
  const whatsappNumber = profile?.pharmacy?.whatsapp_number
  const pharmacyName = profile?.pharmacy?.name ?? 'Pharmacie'

  const { loading, error, createRequisition, clearError } = useRequisitions()

  const [items, setItems] = useState<SelectedItem[]>([])
  const [comment, setComment] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [createdRequisition, setCreatedRequisition] = useState<Requisition | null>(null)
  const [whatsappDestNumber, setWhatsappNameDestNumber] = useState<string | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualProductName, setManualProductName] = useState('')

  // Charger le numéro WhatsApp configuré
  useEffect(() => {
    getWhatsAppNumber().then(setWhatsappNameDestNumber)
  }, [])

  // --- Ajouter un produit manuellement ----------------------------------------
  const handleAddManualProduct = useCallback(async () => {
    const name = manualProductName.trim()
    if (!name) return

    // Vérifier si un produit avec ce nom existe déjà dans la DB
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .ilike('name', name)
      .limit(1)

    const productId = existing && existing.length > 0
      ? existing[0].id
      : crypto.randomUUID()

    // Si le produit n'existe pas, le créer dans la table products
    if (!existing || existing.length === 0) {
      await supabase.from('products').insert({
        id: productId,
        name: name,
        main_depot_stock: 0,
      })
    }

    setItems((prev) => {
      if (prev.some((i) => i.product_name.toLowerCase() === name.toLowerCase())) {
        return prev
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          product_id: productId,
          product_name: name,
          quantity: 1,
        },
      ]
    })
    setManualProductName('')
  }, [manualProductName])

  // --- Ajouter un produit -----------------------------------------------------
  const handleProductSelect = useCallback((product: Product) => {
    // Éviter les doublons
    setItems((prev) => {
      if (prev.some((i) => i.product_id === product.id)) {
        return prev
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit: product.unit,
        },
      ]
    })
  }, [])

  // --- Modifier la quantité --------------------------------------------------
  const handleQuantityChange = useCallback((index: number, quantity: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity } : item))
    )
  }, [])

  // --- Supprimer un article ---------------------------------------------------
  const handleRemove = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // --- Enregistrer comme brouillon -------------------------------------------
  const handleSaveDraft = useCallback(async () => {
    if (!pharmacyId || !profile) return
    clearError()

    const req = await createRequisition(
      {
        pharmacy_id: pharmacyId,
        items: items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity_requested: item.quantity,
        })),
        comment: comment.trim() || undefined,
      },
      profile.id
    )

    if (req) {
      setCreatedRequisition(req)
      setSuccessMessage('Brouillon enregistré avec succès.')
    }
  }, [pharmacyId, profile, items, comment, createRequisition, clearError])

  // --- Envoyer via WhatsApp --------------------------------------------------
  const handleSendWhatsApp = useCallback(async () => {
    if (!pharmacyId || !profile) return
    clearError()

    // 1. Sauvegarder la réquisition
    const req = await createRequisition(
      {
        pharmacy_id: pharmacyId,
        items: items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity_requested: item.quantity,
        })),
        comment: comment.trim() || undefined,
      },
      profile.id
    )

    if (!req) return

    setCreatedRequisition(req)
    setSuccessMessage('Réquisition envoyée avec succès !')

    // 2. Générer et ouvrir le lien WhatsApp
    const message = formatWhatsAppMessage(req, pharmacyName)
    // Utiliser le numéro configuré en paramètres, sinon le numéro de la pharmacie
    const phone = whatsappDestNumber ?? whatsappNumber ?? ''
    if (phone) {
      const link = generateWhatsAppLink(phone, message)
      window.open(link, '_blank')
    }
  }, [pharmacyId, profile, items, comment, whatsappNumber, whatsappDestNumber, pharmacyName, createRequisition, clearError])

  // --- Réinitialiser le formulaire -------------------------------------------
  const handleReset = useCallback(() => {
    setItems([])
    setComment('')
    setSuccessMessage(null)
    setCreatedRequisition(null)
  }, [])

  // --- Écran de succès -------------------------------------------------------
  if (successMessage && createdRequisition) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-green-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-bold text-gray-900">Succès</h2>
          <p className="mb-1 text-sm text-gray-600">{successMessage}</p>
          <p className="mb-6 text-xs text-gray-400">Réf : {createdRequisition.reference_number}</p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleReset}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Créer une autre réquisition
            </button>
            <button
              onClick={() => navigate('/historique')}
              className="flex h-12 w-full items-center justify-center rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              Voir l'historique
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- Écran de création ------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barre supérieure */}
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <BackButton />
          <h1 className="text-lg font-bold text-gray-900">Nouvelle réquisition</h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Barre de recherche */}
        <div className="mb-3">
          <SearchBar onSelect={handleProductSelect} placeholder="Rechercher un produit…" />
        </div>

        {/* Saisie manuelle pour produit non trouvé */}
        <button
          type="button"
          onClick={() => setShowManualEntry(!showManualEntry)}
          className="mb-3 text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          {showManualEntry ? 'Masquer la saisie manuelle' : 'Produit non trouvé ? Saisir manuellement'}
        </button>

        {showManualEntry && (
          <div className="mb-4 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={manualProductName}
                onChange={(e) => setManualProductName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddManualProduct() }}
                placeholder="Nom du produit…"
                className="block h-11 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddManualProduct}
                disabled={!manualProductName.trim()}
                className="flex h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>
          </div>
        )}

        {/* Compteur d'articles */}
        {items.length > 0 && (
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">
              {items.length} article{items.length !== 1 ? 's' : ''} sélectionné{items.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => setItems([])}
              className="text-xs font-medium text-red-600 hover:text-red-700"
            >
              Tout supprimer
            </button>
          </div>
        )}

        {/* Liste des articles sélectionnés */}
        <div className="space-y-2">
          {items.map((item, index) => (
            <RequisitionItemRow
              key={item.id}
              item={item}
              index={index}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemove}
            />
          ))}
        </div>

        {/* Commentaire */}
        {items.length > 0 && (
          <div className="mt-4">
            <label htmlFor="comment" className="mb-1.5 block text-sm font-medium text-gray-700">
              Commentaire (optionnel)
            </label>
            <textarea
              id="comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ajoutez une note ou une précision…"
              className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Boutons d'action */}
        {items.length > 0 && (
          <div className="mt-6 space-y-3">
            <button
              onClick={handleSendWhatsApp}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 active:bg-green-800"
            >
              {loading ? <LoadingSpinner size="sm" /> : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Envoyer via WhatsApp
                </>
              )}
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Enregistrer'}
            </button>
          </div>
        )}

        {/* Message vide si aucun article */}
        {items.length === 0 && (
          <div className="mt-8 flex flex-col items-center justify-center text-center">
            <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-sm font-medium text-gray-500">
              Recherchez un produit ci-dessus pour commencer
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
