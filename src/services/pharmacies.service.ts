// ─── RdivExport – Service Pharmacies ────────────────────────────────────────
// Opérations de lecture sur les pharmacies.

import { supabase } from '@/lib/supabase'
import type { Pharmacy } from '@/types'
import type { UUID } from '@/types/database'

// ─── Utilitaire interne ─────────────────────────────────────────────────────

/** Transforme une ligne de base de données en objet Pharmacy métier */
function mapRowToPharmacy(row: any): Pharmacy {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    address: (row as any).address ?? null,
    phone: (row as any).phone ?? null,
    whatsapp_number: (row as any).whatsapp_number ?? null,
    email: (row as any).email ?? null,
    is_active: (row as any).is_active !== false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// ─── Fonctions publiques ───────────────────────────────────────────────────

/**
 * Récupère une pharmacie par son identifiant.
 *
 * @param id - UUID de la pharmacie
 * @returns La pharmacie trouvée ou null
 */
export async function getPharmacyById(
  id: UUID
): Promise<{ data: Pharmacy | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    if (!data) {
      return { data: null, error: 'Pharmacie introuvable' }
    }

    return { data: mapRowToPharmacy(data), error: null }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Erreur lors de la récupération de la pharmacie'
    return { data: null, error: message }
  }
}

/**
 * Récupère toutes les pharmacies actives, triées par nom.
 *
 * @returns Liste complète des pharmacies actives
 */
export async function getAllPharmacies(): Promise<{
  data: Pharmacy[]
  error: string | null
}> {
  try {
    const { data, error } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      return { data: [], error: error.message }
    }

    return {
      data: (data ?? []).map(mapRowToPharmacy),
      error: null,
    }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Erreur lors de la récupération des pharmacies'
    return { data: [], error: message }
  }
}

/**
 * Récupère la pharmacie associée à un utilisateur (via le profil).
 *
 * @param userId - UUID de l'utilisateur (auth.users.id)
 * @returns La pharmacie de l'utilisateur ou null
 */
export async function getPharmacyByUserId(
  userId: UUID
): Promise<{ data: Pharmacy | null; error: string | null }> {
  try {
    // Récupérer le profil pour obtenir le pharmacy_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('pharmacy_id')
      .eq('id', userId)
      .single()

    if (profileError) {
      return { data: null, error: profileError.message }
    }

    if (!profile || !profile.pharmacy_id) {
      return { data: null, error: 'Aucune pharmacie associée à cet utilisateur' }
    }

    // Récupérer la pharmacie complète
    return await getPharmacyById(profile.pharmacy_id)
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Erreur lors de la récupération de la pharmacie de l\'utilisateur'
    return { data: null, error: message }
  }
}
