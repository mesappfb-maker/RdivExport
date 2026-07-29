// ─── RdivExport – Service Worker Registration ──────────────────────────────────
// Enregistre le service worker pour activer les fonctionnalités PWA
// (mise en cache hors-ligne, installation sur l'écran d'accueil).

const SW_URL = '/sw.js'

/**
 * Enregistre le service worker de l'application.
 * Ne fait rien si les service workers ne sont pas supportés par le navigateur.
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Les service workers ne sont pas supportés par ce navigateur.')
    return
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(SW_URL, {
        scope: '/',
      })

      // Mise à jour disponible
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'activated' &&
            navigator.serviceWorker.controller
          ) {
            console.log('[SW] Nouvelle version disponible. Rechargez la page pour appliquer les mises à jour.')
          }
        })
      })

      // Contrôle actif
      if (navigator.serviceWorker.controller) {
        console.log('[SW] Service worker actif et contrôlant la page.')
      }

      // Enregistrement réussi
      console.log('[SW] Enregistrement réussi. Portée :', registration.scope)
    } catch (error) {
      console.error('[SW] Erreur lors de l\'enregistrement du service worker :', error)
    }
  })
}
