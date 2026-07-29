// ─── RdivExport – Protected Route Guard ──────────────────────────────────────
// Vérifie l'état d'authentification et le rôle de l'utilisateur avant d'accorder
// l'accès aux routes protégées. Redirige vers /login si non authentifié, ou vers
// le tableau de bord approprié si le rôle ne correspond pas.

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { ReactNode } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProtectedRouteProps {
  children: ReactNode
}

// ─── Rôle → Routes autorisées ───────────────────────────────────────────────

const PHARMACY_USER_ROUTES = [
  /^\/dashboard(\/.*)?$/,
  /^\/requisition\/new(\/.*)?$/,
  /^\/requisition\/[^/]+(\/.*)?$/,
  /^\/profil(\/.*)?$/,
]

const MAIN_REQUISITIONIST_ROUTES = [
  /^\/admin(\/.*)?$/,
  /^\/profil(\/.*)?$/,
]

// ─── Composant ──────────────────────────────────────────────────────────────

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { state } = useAuth()
  const location = useLocation()

  const currentPath = location.pathname

  // ── Chargement en cours ──
  if (state.loading || !state.initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner message="Chargement de votre session…" />
      </div>
    )
  }

  // ── Non authentifié → redirection vers login ──
  if (!state.user || !state.profile) {
    return <Navigate to="/login" state={{ from: currentPath }} replace />
  }

  const { role } = state.profile

  // ── Vérification des permissions par rôle ──
  if (role === 'pharmacy_user') {
    const isAllowed = PHARMACY_USER_ROUTES.some((pattern) =>
      pattern.test(currentPath)
    )
    if (!isAllowed) {
      return <Navigate to="/dashboard" replace />
    }
  } else if (role === 'main_requisitionist') {
    const isAllowed = MAIN_REQUISITIONIST_ROUTES.some((pattern) =>
      pattern.test(currentPath)
    )
    if (!isAllowed) {
      return <Navigate to="/admin" replace />
    }
  }

  // ── Accès autorisé ──
  return <>{children}</>
}
