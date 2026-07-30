// --- RdivExport - Page Paramètres -----------------------------------------
// Admin : WhatsApp, comptes utilisateurs, pharmacies, création de comptes.

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

const ROLE_OPTIONS = [
  { value: 'centralisateur', label: 'Centralisateur' },
  { value: 'depot_user', label: 'Dépôt' },
  { value: 'pharmacy_user', label: 'Pharmacie' },
]

export default function SettingsPage() {
  const { state: authState } = useAuth()
  const profile = authState.profile
  const role = profile?.role

  const [whatsappNumber, setWhatsappName] = useState('')
  const [whatsappSaving, setWhatsappNameSaving] = useState(false)
  const [whatsappError, setWhatsappNameError] = useState('')

  const [profiles, setProfiles] = useState<Array<Profile & { pharmacy?: Pharmacy }>>([])
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Édition pharmacie
  const [editPharmacy, setEditPharmacy] = useState<Pharmacy | null>(null)
  const [editPhone, setEditPhone] = useState('')
  const [editWhatsapp, setEditWhatsapp] = useState('')
  const [pharmacySaving, setPharmacySaving] = useState(false)

  // Création de compte
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('pharmacy_user')
  const [newPharmacyId, setNewPharmacyId] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [creating, setCreating] = useState(false)

  const flash = useCallback((type: 'success' | 'error', text: string) => {
    setActionMsg({ type, text })
    setTimeout(() => setActionMsg(null), 5000)
  }, [])

  useEffect(() => {
    getSetting('whatsapp_destination_number').then((val) => {
      if (val) setWhatsappName(val)
    })
    if (role === 'main_requisitionist') {
      loadData()
    } else {
      setProfilesLoading(false)
    }
  }, [role])

  const loadData = useCallback(async () => {
    setProfilesLoading(true)
    const [profRes, pharmRes] = await Promise.all([
      supabase.from('profiles').select('*, pharmacies(*)').order('full_name'),
      supabase.from('pharmacies').select('*').order('name'),
    ])
    if (profRes.data) {
      setProfiles(profRes.data as Array<Profile & { pharmacy?: Pharmacy }>)
    }
    if (pharmRes.data) {
      setPharmacies(pharmRes.data.map((r: any) => ({
        id: r.id, name: r.name, code: r.code, address: r.address ?? null,
        phone: r.phone ?? null, whatsapp_number: r.whatsapp_number ?? null,
        email: r.email ?? null, is_active: r.is_active !== false,
        created_at: r.created_at, updated_at: r.updated_at,
      })))
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
    setWhatsappNameError('')
    const result = await setSetting('whatsapp_destination_number', cleaned)
    setWhatsappNameSaving(false)
    if (!result.error) {
      flash('success', 'Numéro WhatsApp enregistré !')
    } else {
      setWhatsappNameError(result.error)
      if (result.error.includes("n'existe pas")) {
        flash('error', 'La table app_settings n\'existe pas. Exécutez la migration SQL.')
      }
    }
  }, [whatsappNumber, flash])

  const handleToggleActive = useCallback(async (userId: string, currentActive: boolean) => {
    setTogglingId(userId)
    const newActive = !currentActive
    const { error } = await supabase.from('profiles').update({ is_active: newActive }).eq('id', userId)
    if (error) {
      flash('error', 'Erreur: ' + error.message)
    } else {
      flash('success', newActive ? 'Compte activé.' : 'Compte désactivé.')
      setProfiles((prev) => prev.map((p) => (p.id === userId ? { ...p, is_active: newActive } : p)))
    }
    setTogglingId(null)
  }, [flash])

  const handleDeleteUser = useCallback(async () => {
    if (!deleteTarget || !deleteReason.trim()) {
      flash('error', 'Veuillez indiquer la raison de la suppression.')
      return
    }
    if (deleteTarget.id === profile?.id) {
      flash('error', 'Impossible de supprimer votre propre compte.')
      return
    }
    setDeleting(true)
    const { error: delError } = await supabase
      .from('profiles')
      .update({ is_active: false, full_name: `[Supprimé] ${deleteTarget.full_name}` })
      .eq('id', deleteTarget.id)
    if (delError) {
      flash('error', 'Erreur: ' + delError.message)
    } else {
      flash('success', 'Compte supprimé.')
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === deleteTarget.id ? { ...p, is_active: false, full_name: `[Supprimé] ${p.full_name}` } : p
        )
      )
    }
    setDeleting(false)
    setDeleteTarget(null)
    setDeleteReason('')
  }, [deleteTarget, deleteReason, profile, flash])

  const handleResetPassword = useCallback(async (email: string, name: string) => {
    flash('success', `Envoi du lien de réinitialisation à ${email}...`)
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) {
      flash('error', `Erreur pour ${name}: ${error.message}`)
    } else {
      flash('success', `Lien envoyé à ${email}`)
    }
  }, [flash])

  // --- Édition pharmacie ---
  const openEditPharmacy = useCallback((p: Pharmacy) => {
    setEditPharmacy(p)
    setEditPhone(p.phone ?? '')
    setEditWhatsapp(p.whatsapp_number ?? '')
  }, [])

  const handleSavePharmacy = useCallback(async () => {
    if (!editPharmacy) return
    setPharmacySaving(true)
    const { error } = await supabase
      .from('pharmacies')
      .update({ phone: editPhone.trim() || null, whatsapp_number: editWhatsapp.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', editPharmacy.id)
    if (error) {
      flash('error', 'Erreur: ' + error.message)
    } else {
      flash('success', 'Numéros de pharmacie mis à jour.')
      setEditPharmacy(null)
      // Recharger les données
      const { data } = await supabase.from('profiles').select('*, pharmacies(*)').order('full_name')
      if (data) setProfiles(data as Array<Profile & { pharmacy?: Pharmacy }>)
      const { data: pharmData } = await supabase.from('pharmacies').select('*').order('name')
      if (pharmData) {
        setPharmacies(pharmData.map((r: any) => ({
          id: r.id, name: r.name, code: r.code, address: r.address ?? null,
          phone: r.phone ?? null, whatsapp_number: r.whatsapp_number ?? null,
          email: r.email ?? null, is_active: r.is_active !== false,
          created_at: r.created_at, updated_at: r.updated_at,
        })))
      }
    }
    setPharmacySaving(false)
  }, [editPharmacy, editPhone, editWhatsapp, flash])

  // --- Création de compte ---
  const handleCreateAccount = useCallback(async () => {
    if (!newEmail.trim() || !newName.trim() || !newPassword.trim()) {
      flash('error', 'Remplissez tous les champs obligatoires.')
      return
    }
    if (newRole === 'pharmacy_user' && !newPharmacyId) {
      flash('error', 'Sélectionnez une pharmacie pour ce compte.')
      return
    }
    setCreating(true)
    try {
      // 1. Créer l'utilisateur dans Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail.trim(),
        password: newPassword,
        options: {
          data: { full_name: newName.trim(), role: newRole },
        },
      })
      if (authError) {
        flash('error', 'Erreur création compte: ' + authError.message)
        setCreating(false)
        return
      }
      if (!authData.user) {
        flash('error', 'Erreur: utilisateur non créé.')
        setCreating(false)
        return
      }
      // 2. Mettre à jour le profil avec le rôle et la pharmacie
      const updates: Record<string, unknown> = {
        full_name: newName.trim(),
        role: newRole,
        updated_at: new Date().toISOString(),
      }
      if (newPharmacyId) updates.pharmacy_id = newPharmacyId

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', authData.user.id)

      if (profileError) {
        flash('error', 'Compte créé mais erreur profil: ' + profileError.message)
      } else {
        flash('success', `Compte ${newRole === 'centralisateur' ? 'centralisateur' : newRole} créé avec succès !`)
        // Reset form
        setNewEmail('')
        setNewName('')
        setNewPassword('')
        setNewPharmacyId('')
        setShowCreateAccount(false)
        // Recharger
        loadData()
      }
    } catch (err) {
      flash('error', 'Erreur: ' + (err instanceof Error ? err.message : 'Inconnue'))
    }
    setCreating(false)
  }, [newEmail, newName, newRole, newPharmacyId, newPassword, flash, loadData])

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
        <div className="mx-auto max-w-lg px-4 pt-4">
          <div className={`rounded-xl border p-3 text-sm font-medium ${
            actionMsg.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
          }`}>{actionMsg.text}</div>
        </div>
      )}

      <div className="mx-auto max-w-lg px-4 py-4 space-y-4">
        {/* Numéro WhatsApp */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-gray-900">Numéro WhatsApp de destination</h2>
          <p className="mb-3 text-xs text-gray-500">Format international : +243 xxx xxx xxx</p>
          <div className="flex gap-2">
            <input type="tel" value={whatsappNumber} onChange={(e) => { setWhatsappName(e.target.value); setWhatsappNameError('') }}
              placeholder="+243 xxx xxx xxx"
              className="block h-11 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            <button onClick={handleSaveWhatsApp} disabled={whatsappSaving || !whatsappNumber.trim()}
              className="flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
              {whatsappSaving ? <LoadingSpinner size="sm" /> : 'Enregistrer'}
            </button>
          </div>
          {whatsappError && <p className="mt-2 text-xs text-red-600 font-medium">{whatsappError}</p>}
        </div>

        {/* Comptes utilisateurs */}
        {role === 'main_requisitionist' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Comptes utilisateurs</h2>
                <p className="text-xs text-gray-500">Activez, désactivez ou supprimez les comptes.</p>
              </div>
              <button onClick={() => setShowCreateAccount(true)}
                className="flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Créer
              </button>
            </div>

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
                        }`}>{getInitials(p.full_name)}</div>
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-medium ${p.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{p.full_name}</p>
                          <p className="truncate text-xs text-gray-500">{p.email}</p>
                          <p className="truncate text-[11px] text-gray-400">{p.pharmacy?.name ?? 'Sans pharmacie'} · {ROLE_LABELS[p.role] ?? p.role}</p>
                          {p.pharmacy?.phone && <p className="truncate text-[11px] text-green-600">Tél : {p.pharmacy.phone}</p>}
                          {p.pharmacy?.whatsapp_number && <p className="truncate text-[11px] text-green-600">WhatsApp : {p.pharmacy.whatsapp_number}</p>}
                        </div>
                      </div>
                      <button onClick={() => handleToggleActive(p.id, p.is_active)} disabled={togglingId === p.id || p.id === profile?.id}
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
                      {/* Modifier les numéros de la pharmacie */}
                      {p.pharmacy_id && (
                        <button onClick={() => openEditPharmacy(p.pharmacy!)}
                          className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-50">
                          Modifier pharmacie
                        </button>
                      )}
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

        {/* Pharmacies (liste avec numéros) */}
        {role === 'main_requisitionist' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-1 text-base font-semibold text-gray-900">Pharmacies</h2>
            <p className="mb-3 text-xs text-gray-500">Cliquez sur modifier pour changer les numéros.</p>
            <div className="space-y-2">
              {pharmacies.map((ph) => (
                <div key={ph.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{ph.name} <span className="text-gray-400">({ph.code})</span></p>
                      {ph.phone && <p className="text-[11px] text-gray-500">Tél : {ph.phone}</p>}
                      {ph.whatsapp_number && <p className="text-[11px] text-green-600">WhatsApp : {ph.whatsapp_number}</p>}
                      {!ph.phone && !ph.whatsapp_number && <p className="text-[11px] text-red-400 italic">Aucun numéro</p>}
                    </div>
                    <button onClick={() => openEditPharmacy(ph)}
                      className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-50">
                      Modifier
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
              <textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="Indiquez la raison..." rows={3}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
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

      {/* Dialog d'édition de pharmacie */}
      {editPharmacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditPharmacy(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Modifier {editPharmacy.name}</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Téléphone</label>
                <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+243 xxx xxx xxx"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">WhatsApp</label>
                <input type="tel" value={editWhatsapp} onChange={(e) => setEditWhatsapp(e.target.value)} placeholder="+243 xxx xxx xxx"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row-reverse sm:justify-end">
              <button onClick={handleSavePharmacy} disabled={pharmacySaving}
                className="flex h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">
                {pharmacySaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button onClick={() => setEditPharmacy(null)}
                className="flex h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de création de compte */}
      {showCreateAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateAccount(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Créer un compte</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Nom complet *</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jean Dupont"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Email *</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemple.com"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Mot de passe *</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 6 caractères"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Rôle *</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  {ROLE_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
              </div>
              {newRole === 'pharmacy_user' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Pharmacie *</label>
                  <select value={newPharmacyId} onChange={(e) => setNewPharmacyId(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">-- Sélectionner --</option>
                    {pharmacies.map((ph) => (<option key={ph.id} value={ph.id}>{ph.name} ({ph.code})</option>))}
                  </select>
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row-reverse sm:justify-end">
              <button onClick={handleCreateAccount} disabled={creating}
                className="flex h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">
                {creating ? 'Création...' : 'Créer le compte'}
              </button>
              <button onClick={() => setShowCreateAccount(false)}
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