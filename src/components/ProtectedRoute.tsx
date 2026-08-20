// ─── RdivExport – Route protégée ───────────────────────────────────────────
// Vérifie l'authentification ET l'activation du compte avant d'accorder l'accès.
// Les comptes désactivés (is_active = false) sont redirigés vers la page de connexion
// avec un message d'erreur explicite.

import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { state } = useAuth()
  const location = useLocation()

  const currentPath = location.pathname

  if (state.loading || !state.initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner message="Chargement de votre session…" />
      </div>
    )
  }

  if (!state.user || !state.profile) {
    return <Navigate to="/login" state={{ from: currentPath }} replace />
  }

  // Bloquer les comptes désactivés
  if (!state.profile.is_active) {
    return (
      <Navigate
        to="/login"
        state={{
          from: currentPath,
          disabledAccount: true,
          message: 'Votre compte a été désactivé. Contactez l\'administrateur.',
        }}
        replace
      />
    )
  }

  return <>{children}</>
}
