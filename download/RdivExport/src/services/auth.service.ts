// ─── RdivExport – Service d'authentification ─────────────────────────────────
// Gestion de la connexion, déconnexion, session et profil utilisateur.

import { supabase } from '@/lib/supabase'
import type { Profile, Role } from '@/types'
import type { ProfileRow, ProfileUpdate } from '@/types/database'
import type { UUID } from '@/types/database'
import type {
  Session,
  User,
} from '@supabase/supabase-js'

// ─── Types internes ────────────────────────────────────────────────────────

interface LoginResult {
  session: Session | null
  user: User | null
  profile: Profile | null
  error: string | null
}

interface ProfileResult {
  profile: Profile | null
  error: string | null
}

// ─── Utilitaire interne ─────────────────────────────────────────────────────

/**
 * Transforme une ligne de base de données (ProfileRow) en objet Profile métier,
 * en incluant la pharmacie associée si présente via la jointure.
 */
function mapRowToProfile(
  row: ProfileRow & {
    pharmacies?: {
      id: UUID
      name: string
      code: string
      address: string | null
      phone: string | null
      whatsapp_number: string | null
      email: string | null
      is_active: boolean
      created_at: string
      updated_at: string
    } | null
  }
): Profile {
  return {
    id: row.id,
    user_id: row.user_id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone ?? undefined,
    role: row.role as Role,
    pharmacy_id: row.pharmacy_id ?? undefined,
    pharmacy: row.pharmacies
      ? {
          id: row.pharmacies.id,
          name: row.pharmacies.name,
          code: row.pharmacies.code,
          address: row.pharmacies.address ?? undefined,
          phone: row.pharmacies.phone ?? undefined,
          whatsapp_number: row.pharmacies.whatsapp_number ?? undefined,
          email: row.pharmacies.email ?? undefined,
          is_active: row.pharmacies.is_active,
          created_at: row.pharmacies.created_at,
          updated_at: row.pharmacies.updated_at,
        }
      : undefined,
    avatar_url: row.avatar_url ?? undefined,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// ─── Fonctions publiques ───────────────────────────────────────────────────

/**
 * Connecte un utilisateur avec son email et mot de passe.
 * Récupère automatiquement le profil associé après la connexion.
 */
export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { session: null, user: null, profile: null, error: error.message }
    }

    // Récupérer le profil lié à l'utilisateur connecté
    const profileResult = await getCurrentProfile(data.user.id as UUID)

    if (profileResult.error) {
      // Déconnecter l'utilisateur si le profil est introuvable
      await supabase.auth.signOut()
      return {
        session: data.session,
        user: data.user,
        profile: null,
        error: `Profil introuvable : ${profileResult.error}`,
      }
    }

    return {
      session: data.session,
      user: data.user,
      profile: profileResult.profile,
      error: null,
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Erreur lors de la connexion'
    return { session: null, user: null, profile: null, error: message }
  }
}

/**
 * Déconnecte l'utilisateur courant.
 */
export async function logout(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      return { error: error.message }
    }
    return { error: null }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Erreur lors de la déconnexion'
    return { error: message }
  }
}

/**
 * Récupère la session active de l'utilisateur courant.
 */
export async function getSession(): Promise<{
  session: Session | null
  error: string | null
}> {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()
    if (error) {
      return { session: null, error: error.message }
    }
    return { session, error: null }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Erreur lors de la récupération de la session'
    return { session: null, error: message }
  }
}

/**
 * Récupère l'utilisateur authentifié courant (objet User de Supabase Auth).
 */
export async function getCurrentUser(): Promise<{
  user: User | null
  error: string | null
}> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error) {
      return { user: null, error: error.message }
    }
    return { user, error: null }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Erreur lors de la récupération de l'utilisateur"
    return { user: null, error: message }
  }
}

/**
 * Récupère le profil complet de l'utilisateur courant, avec la pharmacie associée.
 * Si un userId est fourni, récupère le profil de cet utilisateur spécifique.
 */
export async function getCurrentProfile(
  userId?: UUID
): Promise<ProfileResult> {
  try {
    let targetUserId = userId

    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return { profile: null, error: 'Aucun utilisateur authentifié' }
      }
      targetUserId = user.id as UUID
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*, pharmacies(*)')
      .eq('user_id', targetUserId)
      .single()

    if (error) {
      return { profile: null, error: error.message }
    }

    if (!data) {
      return { profile: null, error: 'Profil introuvable' }
    }

    return { profile: mapRowToProfile(data), error: null }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Erreur lors de la récupération du profil'
    return { profile: null, error: message }
  }
}

/**
 * Écoute les changements d'état d'authentification (connexion, déconnexion, etc.).
 * Retourne un objet Subscription qu'il faut nettoyer avec `.unsubscribe()``.
 *
 * @example
 * ```ts
 * const sub = onAuthStateChange((event, session) => {
 *   if (event === 'SIGNED_IN') { ... }
 *   if (event === 'SIGNED_OUT') { ... }
 * })
 * // Nettoyage
 * sub.unsubscribe()
 * ```
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): { unsubscribe: () => void } {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
  return { unsubscribe: () => subscription.unsubscribe() }
}

/**
 * Met à jour le profil de l'utilisateur courant.
 * Seuls les champs fournis seront modifiés (mise à jour partielle).
 */
export async function updateProfile(
  data: ProfileUpdate,
  userId?: UUID
): Promise<ProfileResult> {
  try {
    let targetUserId = userId

    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return { profile: null, error: 'Aucun utilisateur authentifié' }
      }
      targetUserId = user.id as UUID
    }

    const { data: profileData, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('user_id', targetUserId)
      .select('*, pharmacies(*)')
      .single()

    if (error) {
      return { profile: null, error: error.message }
    }

    if (!profileData) {
      return {
        profile: null,
        error: 'Profil introuvable après la mise à jour',
      }
    }

    return { profile: mapRowToProfile(profileData as any), error: null }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Erreur lors de la mise à jour du profil'
    return { profile: null, error: message }
  }
}
