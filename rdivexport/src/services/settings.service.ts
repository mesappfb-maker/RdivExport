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
    if (error) return {}
    const map: Record<string, string> = {}
    if (data) {
      for (const row of data) {
        map[row.key] = row.value
      }
    }
    return map
  } catch {
    return {}
  }
}

/** Récupère un paramètre par sa clé (avec cache court) */
export async function getSetting(key: string): Promise<string | null> {
  const now = Date.now()
  // Recharger le cache s'il est expiré
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

/** Met à jour un paramètre (upsert) et invalide le cache */
export async function setSetting(key: string, value: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value }, { onConflict: 'key' })

    if (error) return { error: error.message }

    // Invalider le cache immédiatement
    cacheTimestamp = 0
    settingsCache = {}
    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour'
    return { error: message }
  }
}

/** Force le rechargement du cache */
export function invalidateSettingsCache(): void {
  cacheTimestamp = 0
  settingsCache = {}
}
