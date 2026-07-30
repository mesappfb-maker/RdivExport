// RdivExport - Service Worker v2
// Cache-first pour les assets statiques, network-first pour l'API.

const CACHE_NAME = 'rdivexport-v3'

// Assets à pré-cacher
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.json',
]

// Installation : pré-cache des assets de base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// Activation : nettoyer les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Requêtes : cache-first pour les assets, network-first pour le reste
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ne pas cacher les requêtes Supabase (API)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request).catch(() => new Response('Hors ligne', { status: 503 }))
    )
    return
  }

  // Assets statiques : cache-first
  if (
    request.method === 'GET' &&
    (url.pathname.match(/\.(js|css|svg|png|jpg|jpeg|webp|woff2?)$/) ||
    url.pathname === '/' ||
    url.pathname === '/index.html'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Navigation : network-first avec fallback hors ligne
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    )
    return
  }

  // Par défaut : network-first
  event.respondWith(
    fetch(request).catch(() => new Response('Hors ligne', { status: 503 }))
  )
})