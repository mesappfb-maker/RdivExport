// ─── RdivExport – Utilitaires de formatage ───────────────────────────────────

import type { Requisition, RequisitionStatus } from '@/types'
import { WHATSAPP_BASE_URL, STATUS_LABELS, STATUS_COLORS } from './constants'

// ─── Date ──────────────────────────────────────────────────────────────────

/**
 * Formate une date ISO en chaîne lisible en français.
 * @param isoDate - Date au format ISO 8601 (string ou Date)
 * @returns Date formatée, ex. « 28 juillet 2025, 14:30 »
 */
export function formatDate(isoDate: string | Date): string {
  const date = typeof isoDate === 'string' ? new Date(isoDate) : isoDate

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Formate une date en format court français (JJ/MM/AAAA).
 */
export function formatDateShort(isoDate: string | Date): string {
  const date = typeof isoDate === 'string' ? new Date(isoDate) : isoDate

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ─── Statut ────────────────────────────────────────────────────────────────

/**
 * Retourne le libellé en français d'un statut de réquisition.
 */
export function formatStatusLabel(status: RequisitionStatus): string {
  return STATUS_LABELS[status] ?? status
}

/**
 * Retourne les classes CSS Tailwind pour le badge d'un statut.
 */
export function formatStatusColor(status: RequisitionStatus): string {
  return STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700 border-gray-300'
}

/**
 * Retourne une représentation complète du statut : libellé + classe CSS.
 * Utile pour afficher un badge directement dans le JSX.
 */
export function formatStatus(status: RequisitionStatus): {
  label: string
  colorClass: string
} {
  return {
    label: formatStatusLabel(status),
    colorClass: formatStatusColor(status),
  }
}

// ─── WhatsApp ──────────────────────────────────────────────────────────────

/**
 * Génère le message WhatsApp formaté pour une réquisition.
 *
 * Format :
 * ```
 * 📋 RÉQUISITION - {pharmacy_name}
 * 📅 Date: {date}
 *
 * {list of products with quantities}
 *
 * 💬 Commentaire: {comment}
 * ```
 */
export function formatWhatsAppMessage(
  requisition: Requisition,
  pharmacyName: string
): string {
  const date = formatDateShort(requisition.created_at)
  const status = formatStatusLabel(requisition.status)

  // Ligne d'en-tête
  const header = `📋 RÉQUISITION - ${pharmacyName}\n📅 Date: ${date}\n🔖 Statut: ${status}`

  // Liste des produits
  const itemsList = requisition.items
    ?.map(
      (item, index) =>
        `${index + 1}. ${item.product?.name ?? item.product_name ?? 'Produit inconnu'} × ${item.quantity_requested}`
    )
    .join('\n') ?? 'Aucun produit'

  // Résumé
  const totalItems = requisition.items?.length ?? 0
  const totalQuantity =
    requisition.items?.reduce((sum, item) => sum + item.quantity_requested, 0) ?? 0
  const summary = `\n\n📦 Total: ${totalItems} produit(s) – ${totalQuantity} unité(s)`

  // Commentaire
  const comment = requisition.comment
    ? `\n\n💬 Commentaire: ${requisition.comment}`
    : ''

  return `${header}\n\n${itemsList}${summary}${comment}`
}

/**
 * Génère un lien WhatsApp cliquable à partir d'un numéro et d'un message.
 * Le numéro doit être au format international sans le « + » ni les espaces
 * (ex. « 2250707070707 » pour la Côte d'Ivoire).
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  // Nettoyer le numéro : retirer tout caractère non numérique
  const cleanPhone = phone.replace(/\D/g, '')

  // Encoder le message pour l'URL
  const encodedMessage = encodeURIComponent(message)

  return `${WHATSAPP_BASE_URL}${cleanPhone}?text=${encodedMessage}`
}

// ─── Numéro de référence ────────────────────────────────────────────────────

/**
 * Génère un numéro de référence de réquisition au format REQ-AAMMJJ-CODE.
 * Utilise le code de la pharmacie suivi d'un compteur sur 2 chiffres.
 * @param pharmacyCode - Code court de la pharmacie (ex: "KLW")
 * @param todayCount - Nombre de réquisitions déjà créées pour cette pharmacie aujourd'hui
 */
export function generateReferenceNumber(pharmacyCode?: string, todayCount?: number): string {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  const datePart = `${year}${month}${day}`

  // Utiliser le code pharmacie + compteur, ou fallback aléatoire
  if (pharmacyCode) {
    const code = pharmacyCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    const count = (todayCount ?? 0) + 1
    return `REQ-${datePart}-${code}${String(count).padStart(2, '0')}`
  }

  // Fallback si pas de code pharmacie
  const randomPart = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `REQ-${datePart}-${randomPart}`
}

// ─── Quantités & stocks ────────────────────────────────────────────────────

/**
 * Formate une quantité avec séparateur de milliers français.
 */
export function formatQuantity(quantity: number): string {
  return new Intl.NumberFormat('fr-FR').format(quantity)
}

/**
 * Détermine si un stock est considéré comme bas.
 */
export function isLowStock(
  currentStock: number,
  threshold?: number
): boolean {
  const min = threshold ?? 50
  return currentStock <= min
}

// ─── Noms ─────────────────────────────────────────────────────────────────

/**
 * Retourne les initiales d'un nom complet (ex. « Jean Dupont » → « JD »).
 */
export function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

/**
 * Tronque un texte à une longueur maximale et ajoute « … » si nécessaire.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}…`
}
