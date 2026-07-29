// ─── RdivExport – Point d'entrée principal ────────────────────────────────────
// Monte l'application React dans le DOM en mode strict.
// Enregistre le service worker pour la PWA.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Enregistrement du service worker pour la PWA (non bloquant)
if ('serviceWorker' in navigator) {
  import('@/utils/sw-register').then(({ registerServiceWorker }) => {
    registerServiceWorker()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
