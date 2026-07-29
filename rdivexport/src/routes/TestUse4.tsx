import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
}

export function PR4({ children }: ProtectedRouteProps) {
  const { state } = useAuth()
  const location = useLocation()
  return <>{children}</>
}
