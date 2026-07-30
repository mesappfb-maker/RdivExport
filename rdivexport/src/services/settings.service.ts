// RdivExport - Service Paramètres
// Gestion des paramètres de l'application (numéro WhatsApp, etc.)
// Stockés dans la table app_settings de Supabase.

import { supabase } from '@/lib/supabase'

export interface AppSettings {
  id: string
  key: string
  value: string
  updated_at: string
}

let settingsCache: Record<string, string> = {}
let cacheTimestamp = 0
const CACHE_TTL = 10_000 // 10 secondes

/** Charge tous les paramètres depuis Supabase */
async function loadSettings(): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase.from('app_settings').select('*')
    if (error) {
      console.error('[settings] loadSettings error:', error.message)
      return {}
    }
    const map: Record<string, string> = {}
    if (data) {
      for (const row of data) {
        map[row.key] = row.value
      }
    }
    return map
  } catch (err) {
    console.error('[settings] loadSettings exception:', err)
    return {}
  }
}

/** Récupère un paramètre par sa clé (avec cache court) */
export async function getSetting(key: string): Promise<string | null> {
  const now = Date.now()
  if (now - cacheTimestamp > CACHE_TTL) {
    settingsCache = await loadSettings()
    cacheTimestamp = now
  }
  return settingsCache[key] ?? null
}

/** Récupère le numéro WhatsApp de destination */
export async function getWhatsAppNumber(): Promise<string | null> {
  return getSetting('whatsapp_destination_number')
}

/** Met à jour un paramètre et invalide le cache */
export async function setSetting(key: string, value: string): Promise<{ error: string | null }> {
  try {
    // Vérifier si la ligne existe déjà
    const { data: existing, error: selectError } = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', key)
      .maybeSingle()

    // Si la table n'existe pas du tout
    if (selectError && selectError.code === '42P01') {
      return { error: 'La table app_settings n\'existe pas. Exécutez la migration SQL dans Supabase.' }
    }
    if (selectError) {
      console.error('[settings] select error:', selectError.message)
      return { error: 'Erreur lors de la vérification : ' + selectError.message }
    }

    let resultError: string | null = null

    if (existing) {
      const { error } = await supabase
        .from('app_settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      resultError = error?.message ?? null
    } else {
      const { error } = await supabase
        .from('app_settings')
        .insert({ key, value })
      resultError = error?.message ?? null
    }

    if (resultError) {
      console.error('[settings] save error:', resultError)
      return { error: resultError }
    }

    // Invalider le cache immédiatement
    cacheTimestamp = 0
    settingsCache = {}
    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour'
    console.error('[settings] exception:', message)
    return { error: message }
  }
}

/** Force le rechargement du cache */
export function invalidateSettingsCache(): void {
  cacheTimestamp = 0
  settingsCache = {}
}