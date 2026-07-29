// ─── RdivExport – Route protégée ───────────────────────────────────────────
// Vérifie l'authentification avant d'accorder l'accès aux routes protégées.
// Tous les utilisateurs authentifiés peuvent accéder à toutes les pages.

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

  return <>{children}</>
}
