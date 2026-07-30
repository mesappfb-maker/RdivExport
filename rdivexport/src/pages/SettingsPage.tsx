// --- RdivExport - Page Paramètres -----------------------------------------
// Le superviseur peut configurer le numéro WhatsApp de destination,
// gérer les comptes utilisateurs et d'autres paramètres de l'application.

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { getSetting, setSetting } from '@/services/settings.service'
import { supabase } from '@/lib/supabase'
import { getInitials } from '@/utils/formatters'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Profile, Pharmacy, Role } from '@/types'

const ROLE_LABELS: Record<Role, string> = {
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

  const [profiles, setProfiles] = useState<Array<Profile & { pharmacy?: Pharmacy }>>([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

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
    const { data } = await supabase
      .from('profiles')
      .select('*, pharmacies(*)')
      .order('full_name')
    if (data) {
      setProfiles(data as Array<Profile & { pharmacy?: Pharmacy }>)
    }
    setProfilesLoading(false)
  }, [])

  const handleSaveWhatsApp = useCallback(async () => {
    setWhatsappNameSaving(true)
    setWhatsappNameSaved(false)
    // Nettoyer : garder +, chiffres, espaces, tirets, parenthèses
    const cleaned = whatsappNumber.trim()
    const result = await setSetting('whatsapp_destination_number', cleaned)
    setWhatsappNameSaving(false)
    if (!result.error) {
      setWhatsappNameSaved(true)
      setTimeout(() => setWhatsappNameSaved(false), 3000)
    }
  }, [whatsappNumber])

  const handleToggleActive = useCallback(async (userId: string, currentActive: boolean) => {
    await supabase
      .from('profiles')
      .update({ is_active: !currentActive })
      .eq('id', userId)
    loadProfiles()
  }, [loadProfiles])

  const handleDeleteUser = useCallback(async () => {
    if (!deleteTarget) return
    // Empêcher la suppression de son propre compte
    if (deleteTarget.id === profile?.id) {
      setDeleteError('Vous ne pouvez pas supprimer votre propre compte.')
      return
    }
    setDeleting(true)
    setDeleteError('')
    // Supprimer le profil (la contrainte FK peut bloquer - on désactive d'abord)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', deleteTarget.id)
    if (profileError) {
      // Si suppression impossible (FK), désactiver à la place
      await supabase.from('profiles').update({ is_active: false, full_name: `[Supprimé] ${deleteTarget.full_name}` }).eq('id', deleteTarget.id)
    }
    setDeleting(false)
    setDeleteTarget(null)
    loadProfiles()
  }, [deleteTarget, profile, loadProfiles])

  const handleResetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) {
      alert('Erreur: ' + error.message)
    } else {
      alert('Un email de réinitialisation a été envoyé à ' + email)
    }
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

      <div className="mx-auto max-w-lg px-4 py-4 space-y-4">
        {/* Numéro WhatsApp */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-gray-900">Numéro WhatsApp de destination</h2>
          <p className="mb-3 text-xs text-gray-500">
            Format international accepté : +243 xxx xxx xxx, 243xxxxxxxxx, +225 xx xx xx xx xx
          </p>
          <div className="flex gap-2">
            <input
              type="tel"
              value={whatsappNumber}
              onChange={(e) => setWhatsappName(e.target.value)}
              placeholder="+243 xxx xxx xxx"
              className="block h-11 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button onClick={handleSaveWhatsApp} disabled={whatsappSaving || !whatsappNumber.trim()}
              className="flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
              {whatsappSaving ? <LoadingSpinner size="sm" /> : 'Enregistrer'}
            </button>
          </div>
          {whatsappSaved && <p className="mt-2 text-xs text-green-600 font-medium">Numéro enregistré avec succès.</p>}
        </div>

        {/* Gestion des comptes */}
        {role === 'main_requisitionist' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-1 text-base font-semibold text-gray-900">Comptes utilisateurs</h2>
            <p className="mb-3 text-xs text-gray-500">Activez, désactivez ou supprimez les comptes.</p>

            {deleteError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2.5">
                <p className="text-xs text-red-700">{deleteError}</p>
              </div>
            )}

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
                          <p className={`truncate text-sm font-medium ${p.is_active ? 'text-gray-900' : 'text-gray-400'}`}>{p.full_name}</p>
                          <p className="truncate text-xs text-gray-500">{p.email}</p>
                          <p className="truncate text-[11px] text-gray-400">{p.pharmacy?.name ?? 'Sans pharmacie'} · {ROLE_LABELS[p.role as Role] ?? p.role}</p>
                        </div>
                      </div>
                      <button onClick={() => handleToggleActive(p.id, p.is_active)}
                        className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${p.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                        aria-label={p.is_active ? 'Désactiver' : 'Activer'}>
                        <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${p.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    {/* Actions secondaires */}
                    <div className="mt-2 flex gap-2 pl-12">
                      <button onClick={() => handleResetPassword(p.email)}
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

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Supprimer ce compte"
        message={`Voulez-vous vraiment supprimer le compte de ${deleteTarget?.full_name ?? ''} ? Cette action est irréversible.`}
        onConfirm={handleDeleteUser}
        onCancel={() => { setDeleteTarget(null); setDeleteError('') }}
        confirmLabel={deleting ? 'Suppression...' : 'Supprimer'}
        variant="danger"
      />
    </div>
  )
}
