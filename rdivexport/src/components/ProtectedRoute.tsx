import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/LoadingSpinner'

interface ProtectedRouteProps {
  children: ReactNode
}

const PHARMACY_USER_ROUTES = [
  /^\/dashboard(\/\.*)?$/,
  /^\/requisition\/new(\/\.*)?$/,
  /^\/requisition\/[^/]+(\/\.*)?$/,
  /^\/profil(\/\.*)?$/,
]

const MAIN_REQUISITIONIST_ROUTES = [
  /^\/admin(\/\.*)?$/,
  /^\/profil(\/\.*)?$/,
]

export function ProtectedRoute({ children }: ProtectedRouteProps) {
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

  const { role } = state.profile

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

  return <>{children}</>
}
