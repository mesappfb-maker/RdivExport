// --- RdivExport - Login Page ------------------------------------------------
// Page de connexion avec identifiants email/mot de passe.
// Redirige selon le rôle : pharmacy_user -> /dashboard, main_requisitionist -> /admin.

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import * as authService from '@/services/auth.service'
import { APP_NAME } from '@/utils/constants'
import { LoadingSpinner } from '@/components/LoadingSpinner'

// --- Composant ----------------------------------------------------------------

export default function LoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // --- Soumission du formulaire -----------------------------------------------
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      const trimmedEmail = email.trim()
      if (!trimmedEmail || !password) {
        setError('Veuillez renseigner votre email et votre mot de passe.')
        return
      }

      setLoading(true)

      const result = await authService.login(trimmedEmail, password)

      setLoading(false)

      if (result.error || !result.profile) {
        setError(result.error ?? 'Erreur lors de la connexion.')
        return
      }

      // Rediriger selon le rôle
      if (result.profile.role === 'main_requisitionist') {
        navigate('/admin', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    },
    [email, password, navigate]
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100 px-4 py-8">
      {/* Motif décoratif subtil en arrière-plan */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Titre */}
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="RdivExport" className="mx-auto mb-4 h-16 w-16 rounded-2xl shadow-lg shadow-blue-600/30 object-cover" />
          <h1 className="text-2xl font-bold text-gray-900">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-gray-500">Gestion des réquisitions pharmaceutiques</p>
        </div>

        {/* Formulaire */}
        <div className="rounded-2xl border border-gray-200/80 bg-white/80 p-6 shadow-xl backdrop-blur-sm sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="block h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Bouton de connexion */}
            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 active:bg-blue-800"
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
        </div>

        {/* Footer discret */}
        <p className="mt-6 text-center text-xs text-gray-400">
          {APP_NAME} v1.0.0 · Gestion de réquisitions
        </p>
      </div>
    </div>
  )
}
