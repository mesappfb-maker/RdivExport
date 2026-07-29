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

const SETTINGS_CACHE = new Map<string, string>()
let settingsLoaded = false

/** Charge tous les paramètres en cache */
async function ensureSettingsLoaded(): Promise<void> {
  if (settingsLoaded) return
  try {
    const { data } = await supabase.from('app_settings').select('*')
    if (data) {
      SETTINGS_CACHE.clear()
      for (const row of data) {
        SETTINGS_CACHE.set(row.key, row.value)
      }
    }
    settingsLoaded = true
  } catch {
    // En cas d'erreur, on continue avec un cache vide
  }
}

/** Récupère un paramètre par sa clé */
export async function getSetting(key: string): Promise<string | null> {
  await ensureSettingsLoaded()
  return SETTINGS_CACHE.get(key) ?? null
}

/** Récupère le numéro WhatsApp de destination configuré */
export async function getWhatsAppNumber(): Promise<string | null> {
  return getSetting('whatsapp_destination_number')
}

/** Met à jour un paramètre (upsert) */
export async function setSetting(key: string, value: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value }, { onConflict: 'key' })

    if (error) return { error: error.message }

    // Mettre à jour le cache
    SETTINGS_CACHE.set(key, value)
    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour'
    return { error: message }
  }
}

/** Réinitialise le cache (utile après un changement) */
export function resetSettingsCache(): void {
  SETTINGS_CACHE.clear()
  settingsLoaded = false
}
