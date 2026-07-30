// --- RdivExport - Page Paramètres -----------------------------------------
// Le superviseur peut configurer le numéro WhatsApp de destination,
// gérer les comptes utilisateurs et d'autres paramètres de l'application.

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { getSetting, setSetting } from '@/services/settings.service'
import { supabase } from '@/lib/supabase'
import { getInitials } from '@/utils/formatters'
import type { Profile, Pharmacy } from '@/types'
import type { Role } from '@/types'

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: 'main_requisitionist', label: 'Superviseur' },
  { value: 'centralisateur', label: 'Centralisateur' },
  { value: 'depot_user', label: 'Dépôt' },
  { value: 'pharmacy_user', label: 'Pharmacie / Shop' },
]

// --- Composant ----------------------------------------------------------------

export default function SettingsPage() {
  const { state: authState } = useAuth()
  const profile = authState.profile
  const role = profile?.role

  const [whatsappNumber, setWhatsappName] = useState('')
  const [whatsappSaving, setWhatsappNameSaving] = useState(false)
  const [whatsappSaved, setWhatsappNameSaved] = useState(false)

  const [profiles, setProfiles] = useState<Array<Profile & { pharmacy?: Pharmacy }>>([])
  const [profilesLoading, setProfilesLoading] = useState(true)

  // --- Chargement initial ----------------------------------------------------
  useEffect(() => {
    // Charger le numéro WhatsApp
    getSetting('whatsapp_destination_number').then((val) => {
      if (val) setWhatsappName(val)
    })

    // Charger les profils (superviseur uniquement)
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

  // --- Sauvegarder le numéro WhatsApp ----------------------------------------
  const handleSaveWhatsApp = useCallback(async () => {
    setWhatsappNameSaving(true)
    setWhatsappNameSaved(false)
    const result = await setSetting('whatsapp_destination_number', whatsappNumber.trim())
    setWhatsappNameSaving(false)
    if (!result.error) {
      setWhatsappNameSaved(true)
      setTimeout(() => setWhatsappNameSaved(false), 3000)
    }
  }, [whatsappNumber])

  // --- Basculer le statut actif d'un utilisateur -----------------------------
  const handleToggleActive = useCallback(async (userId: string, currentActive: boolean) => {
    await supabase
      .from('profiles')
      .update({ is_active: !currentActive })
      .eq('id', userId)
    loadProfiles()
  }, [loadProfiles])

  // --- Changer le rôle d'un utilisateur -------------------------------------
  const handleRoleChange = useCallback(async (userId: string, newRole: Role) => {
    await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
    loadProfiles()
  }, [loadProfiles])

  // --- Réinitialiser le mot de passe d'un utilisateur ------------------------
  const handleResetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) {
      alert('Erreur: ' + error.message)
    } else {
      alert('Un email de réinitialisation a été envoyé à ' + email)
    }
  }, [])

  // --- Rendu ------------------------------------------------------------------
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
        {/* ── Numéro WhatsApp de destination ── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-gray-900">
            Numéro WhatsApp de destination
          </h2>
          <p className="mb-3 text-xs text-gray-500">
            Ce numéro recevra les messages WhatsApp lors de l'envoi des réquisitions.
            Format international sans le « + » (ex: 2250707070707).
          </p>

          <div className="flex gap-2">
            <input
              type="tel"
              value={whatsappNumber}
              onChange={(e) => setWhatsappName(e.target.value)}
              placeholder="2250707070707"
              inputMode="numeric"
              className="block h-11 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              onClick={handleSaveWhatsApp}
              disabled={whatsappSaving || !whatsappNumber.trim()}
              className="flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {whatsappSaving ? <LoadingSpinner size="sm" /> : 'Enregistrer'}
            </button>
          </div>

          {whatsappSaved && (
            <p className="mt-2 text-xs text-green-600 font-medium">
              Numéro enregistré avec succès.
            </p>
          )}
        </div>

        {/* ── Gestion des comptes (superviseur uniquement) ── */}
        {role === 'main_requisitionist' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-1 text-base font-semibold text-gray-900">
              Comptes utilisateurs
            </h2>
            <p className="mb-3 text-xs text-gray-500">
              Gérez les comptes et activez/désactivez les accès.
            </p>

            {profilesLoading ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner size="sm" message="Chargement..." />
              </div>
            ) : (
              <div className="space-y-2">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        p.is_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-400'
                      }`}>
                        {getInitials(p.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-medium ${p.is_active ? 'text-gray-900' : 'text-gray-400'}`}>
                          {p.full_name}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {p.pharmacy?.name ?? 'Sans pharmacie'} · {p.role === 'main_requisitionist' ? 'Superviseur' : 'Pharmacien'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleActive(p.id, p.is_active)}
                      className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${
                        p.is_active ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                      aria-label={p.is_active ? 'Désactiver' : 'Activer'}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                          p.is_active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
