// ─── RdivExport – PWA Install Prompt Hook ──────────────────────────────────
// Détecte si l'app peut être installée (beforeinstallprompt) et fournit
// une fonction pour déclencher l'installation.

import { useState, useEffect, useCallback, useRef } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAInstallState {
  canInstall: boolean
  isInstalled: boolean
  isIOS: boolean
  promptInstall: () => Promise<void>
  dismiss: () => void
}

export function usePWAInstall(): PWAInstallState {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Détecter iOS
    const isIOSDevice = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    const isSafari = navigator.userAgent.toLowerCase().includes('safari')
    setIsIOS(isIOSDevice && isSafari && !('standalone' in window.navigator && (window.navigator as any).standalone))

    // Vérifier si déjà installé
    if (window.matchMedia('(display-mode: standalone)').matches || ('standalone' in window.navigator && (window.navigator as any).standalone)) {
      setIsInstalled(true)
      return
    }

    // Écouter beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // L'app a été installée
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setCanInstall(false)
      deferredPrompt.current = null
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt()
      const { outcome } = await deferredPrompt.current.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
      }
      setCanInstall(false)
      deferredPrompt.current = null
    }
  }, [])

  const dismiss = useCallback(() => {
    setCanInstall(false)
  }, [])

  return { canInstall, isInstalled, isIOS, promptInstall, dismiss }
}
