// --- RdivExport - Requisition Detail Page ------------------------------------
// Affichage complet d'une requisition : infos, articles, actions selon le statut.

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRequisitions } from '@/hooks/useRequisitions'
import { BackButton } from '@/components/BackButton'
import { StatusBadge } from '@/components/StatusBadge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { formatDate, formatQuantity, formatWhatsAppMessage, generateWhatsAppLink } from '@/utils/formatters'
import type { RequisitionStatus } from '@/types'

// --- Composant ----------------------------------------------------------------

export default function RequisitionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state: authState } = useAuth()
  const profile = authState.profile

  const { currentRequisition: req, loading, error, fetchRequisitionDetail, updateStatus } = useRequisitions()

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // --- Chargement ------------------------------------------------------------
  useEffect(() => {
    if (id) {
      fetchRequisitionDetail(id)
    }
  }, [id, fetchRequisitionDetail])

  // --- Actions ---------------------------------------------------------------
  const handleDelete = useCallback(async () => {
    if (!id || !profile) return
    setShowDeleteDialog(false)
    setActionLoading(true)
    await updateStatus(id, 'cancelled', profile.id, 'Supprimee par l\'utilisateur')
    setActionLoading(false)
    navigate(-1)
  }, [id, profile, updateStatus, navigate])

  const handleCancel = useCallback(async () => {
    if (!id || !profile) return
    setShowCancelDialog(false)
    setActionLoading(true)
    await updateStatus(id, 'cancelled', profile.id, cancelReason.trim() || undefined)
    setActionLoading(false)
    setCancelReason('')
  }, [id, profile, cancelReason, updateStatus])

  const handleSendWhatsApp = useCallback(() => {
    if (!req || !profile) return
    const message = formatWhatsAppMessage(req, profile.pharmacy?.name ?? 'Pharmacie')
    const phone = profile.pharmacy?.whatsapp_number ?? ''
    if (phone) {
      const link = generateWhatsAppLink(phone, message)
      window.open(link, '_blank')
    }
  }, [req, profile])

  // --- Loading ---------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <LoadingSpinner size="lg" message="Chargement de la requisition..." />
      </div>
    )
  }

  if (!req) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <p className="mb-4 text-sm text-gray-500">{error ?? 'Requisition introuvable.'}</p>
        <BackButton />
      </div>
    )
  }

  const status: RequisitionStatus = req.status
  const isDraft = status === 'draft'
  const isPending = status === 'pending'
  const pharmacyName = req.pharmacy?.name ?? 'Pharmacie inconnue'
  const whatsappNumber = profile?.pharmacy?.whatsapp_number

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barre superieure */}
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <BackButton />
          <h1 className="text-lg font-bold text-gray-900">Details</h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Carte d'information */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-gray-900">{req.reference_number}</p>
              <p className="text-sm text-gray-600">{pharmacyName}</p>
              <p className="mt-1 text-xs text-gray-400">{formatDate(req.created_at)}</p>
            </div>
            <StatusBadge status={status} />
          </div>

          {status === 'cancelled' && req.cancel_reason && (
            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2.5">
              <p className="text-xs font-medium text-red-600">Raison : {req.cancel_reason}</p>
            </div>
          )}

          {status === 'delivered' && req.delivered_at && (
            <p className="mt-2 text-xs text-green-600">Livree le {formatDate(req.delivered_at)}</p>
          )}
          {status === 'validated' && req.validated_at && (
            <p className="mt-2 text-xs text-blue-600">Validee le {formatDate(req.validated_at)}</p>
          )}
        </div>

        {/* Liste des articles */}
        <div className="mt-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Articles ({req.items?.length ?? 0})
          </h2>
          <div className="space-y-2">
            {req.items?.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {item.product?.name ?? 'Produit inconnu'}
                  </p>
                  {item.product?.unit && (
                    <p className="text-xs text-gray-400">{item.product.unit}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatQuantity(item.quantity_requested)}</p>
                  <p className="text-xs text-gray-400">demande{item.quantity_requested > 1 ? 's' : ''}</p>
                  {(item.quantity_delivered ?? 0) > 0 && (
                    <p className="text-xs text-green-600">{formatQuantity(item.quantity_delivered ?? 0)} livre{(item.quantity_delivered ?? 0) > 1 ? 's' : ''}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Commentaire */}
        {req.comment && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-400">Commentaire</h2>
            <p className="text-sm leading-relaxed text-gray-700">{req.comment}</p>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="mt-6 space-y-3 pb-8">
          {whatsappNumber && (
            <button
              onClick={handleSendWhatsApp}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 active:bg-green-800"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Envoyer via WhatsApp
            </button>
          )}

          {isDraft && (
            <>
              <button
                onClick={() => navigate(`/requisition/${id}/edit`)}
                disabled={actionLoading}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
              >
                Modifier
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                disabled={actionLoading}
                className="flex h-12 w-full items-center justify-center rounded-xl border border-red-300 bg-red-50 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-60"
              >
                Supprimer
              </button>
            </>
          )}

          {isPending && (
            <button
              onClick={() => setShowCancelDialog(true)}
              disabled={actionLoading}
              className="flex h-12 w-full items-center justify-center rounded-xl border border-yellow-300 bg-yellow-50 text-sm font-semibold text-yellow-700 transition-colors hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-60"
            >
              Annuler la requisition
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Supprimer la requisition"
        message="Cette action est irreversible. Voulez-vous vraiment supprimer cette requisition ?"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        confirmLabel="Supprimer"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showCancelDialog}
        title="Annuler la requisition"
        message="Etes-vous sur de vouloir annuler cette requisition ?"
        messageExtra={
          <div>
            <label htmlFor="cancel-reason" className="mb-1 block text-xs font-medium text-gray-600">
              Raison de l\'annulation (optionnel)
            </label>
            <input
              id="cancel-reason"
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Indiquez la raison..."
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        }
        onConfirm={handleCancel}
        onCancel={() => { setShowCancelDialog(false); setCancelReason('') }}
        confirmLabel="Annuler"
        variant="warning"
      />
    </div>
  )
}
