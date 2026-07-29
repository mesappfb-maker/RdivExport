// --- RdivExport - Profile Page ---------------------------------------------
// Informations du profil utilisateur et deconnexion.

import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { APP_NAME, APP_VERSION, ROLE_LABELS } from '@/utils/constants'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { state: authState, logout } = useAuth()
  const { profile, loading: authLoading } = authState

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <LoadingSpinner size="lg" message="Chargement..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-4 pb-6 pt-6 shadow-sm">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700">
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <h1 className="text-xl font-bold text-gray-900">{profile?.full_name ?? 'Utilisateur'}</h1>
          <p className="text-sm text-gray-500">{profile?.email ?? ''}</p>
          <span className="mt-2 inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-700">
            {profile?.role ? ROLE_LABELS[profile.role] : 'Role inconnu'}
          </span>
        </div>
      </div>
      <div className="mx-auto max-w-lg px-4 py-4">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="divide-y divide-gray-100">
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-gray-500">Pharmacie</span>
              <span className="text-sm font-medium text-gray-900">
                {profile?.pharmacy?.name ?? 'Non associee'}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-gray-500">Telephone</span>
              <span className="text-sm font-medium text-gray-900">
                {profile?.phone ?? 'Non renseigne'}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-gray-500">Version</span>
              <span className="text-sm font-medium text-gray-900">{APP_NAME} v{APP_VERSION}</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={authLoading}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-60"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Se deconnecter
        </button>
      </div>
    </div>
  )
}
