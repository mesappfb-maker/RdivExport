// --- RdivExport - Page Paramètres -----------------------------------------
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { getSetting, setSetting } from '@/services/settings.service'
import { supabase } from '@/lib/supabase'
import { getInitials } from '@/utils/formatters'
import type { Profile, Pharmacy } from '@/types'

const ROLE_LABELS: Record<string, string> = {
  main_requisitionist: 'Superviseur',
  centralisateur: 'Centralisateur',
  depot_user: 'Dépôt',
  pharmacy_user: 'Pharmacie',
}

export default function SettingsPage() {
  const { state: authState } = useAuth()
  const profile = authState.profile
  const role = profile?.role

  const [whatsappNumber, setWhatsappName] = useState('')
  const [whatsappSaving, setWhatsappNameSaving] = useState(false)
  const [whatsappSaved, setWhatsappNameSaved] = useState(false)
  const [whatsappError, setWhatsappNameError] = useState('')

  const [profiles, setProfiles] = useState<Array<Profile & { pharmacy?: Pharmacy }>>([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    getSetting('whatsapp_destination_number').then((val) => {
      if (val) setWhatsappName(val)
    })
    if (role === 'main_requisitionist') {
      loadProfiles()
    } else {
      setProfilesLoading(false)
    }
  }, [role])

  const loadProfiles = useCallback(async () => {
    setProfilesLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*, pharmacies(*)')
      .order('full_name')
    if (error) {
      console.error('[Settings] loadProfiles error:', error.message)
      setActionMsg({ type: 'error', text: 'Erreur chargement profils : ' + error.message })
    }
    if (data) {
      setProfiles(data as Array<Profile & { pharmacy?: Pharmacy }>)
    }
    setProfilesLoading(false)
  }, [])

  const handleSaveWhatsApp = useCallback(async () => {
    const cleaned = whatsappNumber.trim()
    if (!cleaned) return

    const digits = cleaned.replace(/\D/g, '')
    if (digits.length < 8) {
      setWhatsappNameError('Le numéro doit contenir au moins 8 chiffres.')
      return
    }

    setWhatsappNameSaving(true)
    setWhatsappNameSaved(false)
    setWhatsappNameError('')
    const result = await setSetting('whatsapp_destination_number', cleaned)
    setWhatsappNameSaving(false)
    if (!result.error) {
      setWhatsappNameSaved(true)
      setActionMsg({ type: 'success', text: 'Numéro WhatsApp enregistré !' })
      setTimeout(() => { setWhatsappNameSaved(false); setActionMsg(null) }, 3000)
    } else {
      setWhatsappNameError(result.error)
      if (result.error.includes("n'existe pas")) {
        setActionMsg({ type: 'error', text: 'La table app_settings n\'existe pas. Exécutez la migration SQL dans Supabase Dashboard > SQL Editor.' })
        setTimeout(() => setActionMsg(null), 8000)
      }
    }
  }, [whatsappNumber])

  const handleToggleActive = useCallback(async (userId: string, currentActive: boolean) => {
    setTogglingId(userId)
    const newActive = !currentActive
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: newActive })
      .eq('id', userId)
    if (error) {
      setActionMsg({ type: 'error', text: 'Erreur: ' + error.message })
      if (error.message.includes('is_active') || error.message.includes('schema cache')) {
        setActionMsg({ type: 'error', text: 'La colonne is_active n\'existe pas sur profiles. Exécutez la migration SQL dans Supabase.' })
      }
    } else {
      setActionMsg({ type: 'success', text: newActive ? 'Compte activé.' : 'Compte désactivé.' })
      // Mettre à jour l'état local immédiatement
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, is_active: newActive } : p))
      )
    }
    setTimeout(() => setActionMsg(null), 4000)
    setTogglingId(null)
  }, [])

  const handleDeleteUser = useCallback(async () => {
    if (!deleteTarget) return
    if (!deleteReason.trim()) {
      setActionMsg({ type: 'error', text: 'Veuillez indiquer la raison de la suppression.' })
      return
    }
    if (deleteTarget.id === profile?.id) {
      setActionMsg({ type: 'error', text: 'Impossible de supprimer votre propre compte.' })
      return
    }
    setDeleting(true)
    const { error: delError } = await supabase
      .from('profiles')
      .update({ is_active: false, full_name: `[Supprimé] ${deleteTarget.full_name}` })
      .eq('id', deleteTarget.id)
    if (delError) {
      setActionMsg({ type: 'error', text: 'Erreur: ' + delError.message })
    } else {
      setActionMsg({ type: 'success', text: 'Compte supprimé.' })
      setTimeout(() => setActionMsg(null), 3000)
      // Retirer de la liste locale
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === deleteTarget.id
            ? { ...p, is_active: false, full_name: `[Supprimé] ${p.full_name}` }
            : p
        )
      )
    }
    setDeleting(false)
    setDeleteTarget(null)
    setDeleteReason('')
  }, [deleteTarget, deleteReason, profile])

  const handleResetPassword = useCallback(async (email: string, name: string) => {
    setActionMsg({ type: 'success', text: `Envoi du lien de réinitialisation à ${email}...` })
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) {
      setActionMsg({ type: 'error', text: `Erreur pour ${name}: ${error.message}` })
    } else {
      setActionMsg({ type: 'success', text: `Lien envoyé à ${email}` })
    }
    setTimeout(() => setActionMsg(null), 4000)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div />
          <h1 className="text-lg font-bold text-gray-900">Paramètres</h1>
          <div className="w-16" />
        </div>
      </div>

      {/* Message flash */}
      {actionMsg && (
        <div className={`mx-auto max-w-lg px-4 pt-4`}>
          <div className={`rounded-xl border p-3 text-sm font-medium ${
            actionMsg.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {actionMsg.text}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-lg px-4 py-4 space-y-4">
        {/* Numéro WhatsApp */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-gray-900">Numéro WhatsApp de destination</h2>
          <p className="mb-3 text-xs text-gray-500">
            Format international : +243 xxx xxx xxx, 243xxxxxxxxx, +225 xx xx xx xx xx
          </p>
          <div className="flex gap-2">
            <input
              type="tel"
              value={whatsappNumber}
              onChange={(e) => { setWhatsappName(e.target.value); setWhatsappNameError('') }}
              placeholder="+243 xxx xxx xxx"
              className="block h-11 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button onClick={handleSaveWhatsApp} disabled={whatsappSaving || !whatsappNumber.trim()}
              className="flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
              {whatsappSaving ? <LoadingSpinner size="sm" /> : 'Enregistrer'}
            </button>
          </div>
          {whatsappError && <p className="mt-2 text-xs text-red-600 font-medium">{whatsappError}</p>}
          {whatsappSaved && <p className="mt-2 text-xs text-green-600 font-medium">Enregistré avec succès.</p>}
        </div>

        {/* Comptes utilisateurs */}
        {role === 'main_requisitionist' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-1 text-base font-semibold text-gray-900">Comptes utilisateurs</h2>
            <p className="mb-3 text-xs text-gray-500">Activez, désactivez ou supprimez les comptes.</p>

            {profilesLoading ? (
              <div className="flex justify-center py-6"><LoadingSpinner size="sm" message="Chargement..." /></div>
            ) : (
              <div className="space-y-2">
                {profiles.map((p) => (
                  <div key={p.id} className={`rounded-xl border p-3 ${p.is_active ? 'border-gray-100 bg-gray-50' : 'border-red-100 bg-red-50/30'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          p.is_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-400'
                        }`}>
                          {getInitials(p.full_name)}
                        </div>
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-medium ${p.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{p.full_name}</p>
                          <p className="truncate text-xs text-gray-500">{p.email}</p>
                          <p className="truncate text-[11px] text-gray-400">{p.pharmacy?.name ?? 'Sans pharmacie'} · {ROLE_LABELS[p.role] ?? p.role}</p>
                          {p.pharmacy?.phone && <p className="truncate text-[11px] text-green-600">Tél : {p.pharmacy.phone}</p>}
                          {p.pharmacy?.whatsapp_number && <p className="truncate text-[11px] text-green-600">WhatsApp : {p.pharmacy.whatsapp_number}</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleActive(p.id, p.is_active)}
                        disabled={togglingId === p.id || p.id === profile?.id}
                        className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${p.is_active ? 'bg-green-500' : 'bg-gray-300'} ${togglingId === p.id ? 'opacity-50' : ''}`}
                        aria-label={p.is_active ? 'Désactiver' : 'Activer'}>
                        <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${p.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    <div className="mt-2 flex gap-2 pl-12">
                      <button onClick={() => handleResetPassword(p.email, p.full_name)}
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50">
                        Réinitialiser mdp
                      </button>
                      {p.id !== profile?.id && (
                        <button onClick={() => setDeleteTarget(p)}
                          className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-50">
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog de suppression avec justification */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setDeleteTarget(null); setDeleteReason('') }} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className="mb-1 text-lg font-semibold text-gray-900">Supprimer le compte</h2>
            <p className="mb-4 text-sm text-gray-600">Compte de <strong>{deleteTarget.full_name}</strong> ({deleteTarget.email})</p>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-gray-600">Raison de la suppression *</label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Indiquez la raison..."
                rows={3}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-end">
              <button onClick={handleDeleteUser} disabled={deleting || !deleteReason.trim()}
                className="flex h-11 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-60">
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
              <button onClick={() => { setDeleteTarget(null); setDeleteReason('') }}
                className="flex h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}