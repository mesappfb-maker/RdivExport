// ─── RdivExport – Service d'audit ─────────────────────────────────────────────
// Journalisation des actions utilisateur dans la table audit_logs.

import { supabase } from '@/lib/supabase'
import type { AuditAction } from '@/types'
import type { UUID } from '@/types/database'

// ─── Fonctions publiques ───────────────────────────────────────────────────

/**
 * Enregistre une action dans le journal d'audit.
 *
 * @param action     - Type d'action (create, update, validate, etc.)
 * @param entityType - Type d'entité concernée (requisition, product, etc.)
 * @param entityId   - Identifiant de l'entité concernée
 * @param details    - Détails additionnels (ancienne/nouvelle valeur, etc.)
 * @param userId     - Utilisateur à l'origine de l'action. Si omis, utilise l'utilisateur courant.
 */
export async function logAction(
  action: AuditAction | string,
  entityType: string,
  entityId: UUID,
  details?: Record<string, unknown>,
  userId?: UUID
): Promise<{ error: string | null }> {
  try {
    let targetUserId = userId

    // Si aucun userId n'est fourni, utiliser l'utilisateur authentifié courant
    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        // En cas d'absence d'utilisateur (ex. tâche cron), utiliser un UUID nul
        targetUserId = '00000000-0000-0000-0000-000000000000' as UUID
      } else {
        targetUserId = user.id as UUID
      }
    }

    // Récupérer le user-agent du navigateur (non disponible côté serveur)
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null
    // L'adresse IP n'est pas directement accessible côté client
    const ipAddress = null

    const { error } = await supabase.from('audit_logs').insert({
      user_id: targetUserId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: details ?? null,
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    if (error) {
      console.error('[Audit] Erreur lors de la journalisation :', error.message)
      return { error: error.message }
    }

    return { error: null }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Erreur lors de la journalisation'
    console.error('[Audit] Erreur inattendue :', message)
    return { error: message }
  }
}
