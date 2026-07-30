// --- RdivExport - Requisition Detail Page ------------------------------------
// Affichage complet d'une réquisition : infos, articles, actions, export.

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRequisitions } from '@/hooks/useRequisitions'
import { BackButton } from '@/components/BackButton'
import { StatusBadge } from '@/components/StatusBadge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { formatDate, formatQuantity, formatWhatsAppMessage, generateWhatsAppLink } from '@/utils/formatters'
import { exportRequisitionCSV, exportRequisitionPDF } from '@/utils/export'
import { getWhatsAppNumber } from '@/services/settings.service'
import { supabase } from '@/lib/supabase'
import type { RequisitionStatus } from '@/types'

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
  const [deleting, setDeleting] = useState(false)
  const [whatsappDestNumber, setWhatsappNameDestNumber] = useState<string | null>(null)

  useEffect(() => {
    if (id) fetchRequisitionDetail(id)
  }, [id, fetchRequisitionDetail])

  useEffect(() => {
    getWhatsAppNumber().then(setWhatsappNameDestNumber)
  }, [])

  const handleDelete = useCallback(async () => {
    if (!id) return
    setShowDeleteDialog(false)
    setDeleting(true)
    // Supprimer d'abord les items, puis la réquisition
    const { error: itemsError } = await supabase.from('requisition_items').delete().eq('requisition_id', id)
    if (itemsError) {
      setDeleting(false)
      alert('Erreur lors de la suppression des articles : ' + itemsError.message)
      return
    }
    const { error: reqError } = await supabase.from('requisitions').delete().eq('id', id)
    if (reqError) {
      setDeleting(false)
      alert('Erreur lors de la suppression de la réquisition : ' + reqError.message)
      return
    }
    setDeleting(false)
    navigate(-1)
  }, [id, navigate])

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
    const phone = whatsappDestNumber ?? profile.pharmacy?.whatsapp_number ?? ''
    if (phone) {
      const link = generateWhatsAppLink(phone, message)
      window.open(link, '_blank')
    }
  }, [req, profile, whatsappDestNumber])

  const handleExportExcel = useCallback(() => {
    if (req) exportRequisitionCSV(req)
  }, [req])

  const handleExportPDF = useCallback(() => {
    if (req) exportRequisitionPDF(req)
  }, [req])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <LoadingSpinner size="lg" message="Chargement de la réquisition..." />
      </div>
    )
  }

  if (!req) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <p className="mb-4 text-sm text-gray-500">{error ?? 'Réquisition introuvable.'}</p>
        <BackButton />
      </div>
    )
  }

  const status: RequisitionStatus = req.status
  const isPending = status === 'pending' || status === 'draft'
  const pharmacyName = req.pharmacy?.name ?? 'Pharmacie inconnue'
  const hasWhatsApp = !!(whatsappDestNumber || profile?.pharmacy?.whatsapp_number)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <BackButton />
          <h1 className="text-lg font-bold text-gray-900">Détails</h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Carte info */}
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
            <p className="mt-2 text-xs text-green-600">Livrée le {formatDate(req.delivered_at)}</p>
          )}
        </div>

        {/* Articles en grille */}
        <div className="mt-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Articles ({req.items?.length ?? 0})
          </h2>
          {req.items && req.items.length > 0 ? (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {req.items.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">{index + 1}</div>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                      {item.product?.name ?? item.product_name ?? 'Produit inconnu'}
                    </p>
                  </div>
                  <div className="mt-1.5 ml-9 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{item.product?.unit ?? ''}</span>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatQuantity(item.quantity_requested)}</p>
                      {(item.quantity_delivered ?? 0) > 0 && (
                        <p className="text-[11px] text-green-600">livré : {formatQuantity(item.quantity_delivered ?? 0)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Aucun article.</p>
          )}
        </div>

        {req.comment && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-400">Commentaire</h2>
            <p className="text-sm leading-relaxed text-gray-700">{req.comment}</p>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 space-y-3 pb-8">
          {/* Export */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleExportExcel}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50">
              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              Excel
            </button>
            <button onClick={handleExportPDF}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50">
              <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m3 0h.008v.008H15v-.008zm-3 0h.008v.008H12v-.008zM5.25 21h13.5A2.25 2.25 0 0021 18.75V5.25A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21z" /></svg>
              PDF
            </button>
          </div>

          {/* WhatsApp */}
          {hasWhatsApp ? (
            <button onClick={handleSendWhatsApp}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Envoyer via WhatsApp
            </button>
          ) : (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-center">
              <p className="text-xs text-yellow-700">WhatsApp non configuré.</p>
            </div>
          )}

          {/* Annuler */}
          {isPending && (
            <button onClick={() => setShowCancelDialog(true)} disabled={actionLoading}
              className="flex h-12 w-full items-center justify-center rounded-xl border border-yellow-300 bg-yellow-50 text-sm font-semibold text-yellow-700 transition-colors hover:bg-yellow-100 disabled:opacity-60">
              Annuler la réquisition
            </button>
          )}

          {/* Supprimer */}
          {isPending && (
            <button onClick={() => setShowDeleteDialog(true)}
              className="flex h-12 w-full items-center justify-center rounded-xl border border-red-300 bg-red-50 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100">
              Supprimer la réquisition
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Supprimer la réquisition"
        message="Cette action est irréversible. Tous les articles seront également supprimés."
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        confirmLabel={deleting ? 'Suppression...' : 'Supprimer définitivement'}
        variant="danger"
      />

      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowCancelDialog(false); setCancelReason('') }} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">Annuler la réquisition</h2>
            <p className="mb-4 text-sm leading-relaxed text-gray-600">Êtes-vous sûr de vouloir annuler cette réquisition ?</p>
            <div className="mb-4">
              <label htmlFor="cancel-reason" className="mb-1 block text-xs font-medium text-gray-600">Raison (optionnel)</label>
              <input id="cancel-reason" type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Indiquez la raison..."
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-end">
              <button type="button" onClick={handleCancel} className="flex h-11 items-center justify-center rounded-xl bg-yellow-500 px-5 text-sm font-semibold text-white shadow-sm hover:bg-yellow-600">Annuler</button>
              <button type="button" onClick={() => { setShowCancelDialog(false); setCancelReason('') }} className="flex h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">Retour</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
