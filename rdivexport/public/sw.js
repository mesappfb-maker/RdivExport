/// <reference lib="webworker" />

// ─── RdivExport – Service Worker pour PWA ────────────────────────────────────
// Stratégie de mise en cache :
// - Cache-first pour les assets statiques (CSS, JS, images, fonts)
// - Network-first pour les appels API (routes commençant par /rest/v1/)
// - Versionnage du cache pour invalidation lors des mises à jour

declare const self: ServiceWorkerGlobalScope

const CACHE_VERSION = 'rdivexport-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`

// ─── Fichiers à pré-mettre en cache lors de l'installation ─────────────────

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
]

// ─── Événement d'installation ─────────────────────────────────────────────────
// Pré-cache les ressources statiques essentielles et active immédiatement le SW.

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// ─── Événement d'activation ──────────────────────────────────────────────────
// Nettoie les anciens caches lors de la mise à jour du service worker.

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  )
})

// ─── Événement fetch ─────────────────────────────────────────────────────────
// Interception des requêtes réseau :
// - API calls (Supabase) : network-first avec fallback sur cache
// - Static assets : cache-first avec fallback sur réseau
// - Requêtes POST/PUT/DELETE : réseau uniquement (non mises en cache)

self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event
  const url = new URL(request.url)

  // Ne pas intercepter les requêtes non-GET
  if (request.method !== 'GET') {
    return
  }

  // Ne pas intercepter les requêtes chrome-extension
  if (url.protocol === 'chrome-extension:') {
    return
  }

  // API calls : Network-first (Supabase REST API)
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/rest/v1/') ||
    url.pathname.startsWith('/auth/v1/')
  ) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE))
    return
  }

  // Static assets : Cache-first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Navigation HTML : Network-first avec fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE))
    return
  }

  // Par défaut : Network-first
  event.respondWith(networkFirst(request, DYNAMIC_CACHE))
})

// ─── Stratégie : Cache-first ─────────────────────────────────────────────────
// Cherche d'abord dans le cache, puis va sur le réseau si non trouvé.

async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cached = await caches.match(request)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Fallback hors-ligne pour les requêtes de navigation
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html')
      if (fallback) return fallback
    }
    return new Response('Hors ligne', {
      status: 503,
      statusText: 'Service Unavailable',
    })
  }
}

// ─── Stratégie : Network-first ───────────────────────────────────────────────
// Essaie d'abord le réseau, puis fallback sur le cache.

async function networkFirst(request: Request, cacheName: string): Promise<Response> {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }

    // Fallback hors-ligne pour les requêtes de navigation
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html')
      if (fallback) return fallback
    }

    return new Response('Hors ligne', {
      status: 503,
      statusText: 'Service Unavailable',
    })
  }
}

// ─── Helper : Détection des assets statiques ─────────────────────────────────

function isStaticAsset(url: URL): boolean {
  const staticExtensions = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg',
    '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot',
    '.json', '.xml',
  ]
  return staticExtensions.some((ext) => url.pathname.endsWith(ext))
}

export {}
