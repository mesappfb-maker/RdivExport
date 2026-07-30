// --- RdivExport - Login Page ------------------------------------------------
// Page de connexion avec identifiants email/mot de passe.

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import * as authService from '@/services/auth.service'
import { APP_NAME } from '@/utils/constants'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function LoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
      if (result.profile.role === 'main_requisitionist') {
        navigate('/admin', { replace: true })
      } else if (result.profile.role === 'centralisateur') {
        navigate('/centralisateur', { replace: true })
      } else if (result.profile.role === 'depot_user') {
        navigate('/depot/stock', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    },
    [email, password, navigate]
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100 px-4 py-8">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="RdivExport" className="mx-auto mb-4 h-20 w-20 rounded-2xl shadow-lg" />
          <h1 className="text-2xl font-bold text-gray-900">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-gray-500">Gestion des réquisitions pharmaceutiques</p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white/80 p-6 shadow-xl backdrop-blur-sm sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">Adresse email</label>
              <input
                id="email" type="email" autoComplete="email" autoCapitalize="none" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="block h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">Mot de passe</label>
              <div className="relative">
                <input
                  id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="......"
                  className="block h-12 w-full rounded-xl border border-gray-300 bg-white px-4 pr-12 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition-colors hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? 'Masquer' : 'Afficher'}>
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 active:bg-blue-800">
              {loading ? <LoadingSpinner size="sm" /> : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">{APP_NAME} v1.0.0</p>
      </div>
    </div>
  )
}
