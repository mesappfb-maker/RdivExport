// --- RdivExport - Reset Password Page -----------------------------------------
// Page accessible via le lien de réinitialisation envoyé par email.
// Permet à l'utilisateur de définir un nouveau mot de passe.

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { APP_NAME } from '@/utils/constants'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function ResetPasswordPage() {
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [verifying, setVerifying] = useState(true)

  // Vérifier que le hash de récupération est valide au chargement
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      setVerifying(false)
    } else {
      // Pas de hash de recovery → rediriger vers login
      setError('Lien de réinitialisation invalide ou expiré.')
      setVerifying(false)
    }
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      if (!newPassword.trim()) {
        setError('Veuillez entrer un nouveau mot de passe.')
        return
      }

      if (newPassword.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères.')
        return
      }

      if (newPassword !== confirmPassword) {
        setError('Les deux mots de passe ne correspondent pas.')
        return
      }

      setLoading(true)

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      setLoading(false)

      if (updateError) {
        if (updateError.message.includes('expired') || updateError.message.includes('invalid')) {
          setError('Ce lien a expiré. Demandez un nouveau lien de réinitialisation.')
        } else {
          setError(updateError.message)
        }
        return
      }

      setSuccess(true)
      // Rediriger vers login après 3 secondes
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 3000)
    },
    [newPassword, confirmPassword, navigate]
  )

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100 px-4">
        <LoadingSpinner message="Vérification du lien..." />
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Mot de passe mis à jour !</h1>
          <p className="mt-2 text-sm text-gray-600">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
          <p className="mt-4 text-xs text-gray-400">Redirection vers la page de connexion...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100 px-4 py-8">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="RdivExport" className="mx-auto mb-4 h-20 w-20 rounded-2xl shadow-lg" />
          <h1 className="text-2xl font-bold text-gray-900">Nouveau mot de passe</h1>
          <p className="mt-1 text-sm text-gray-500">Entrez votre nouveau mot de passe</p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white/80 p-6 shadow-xl backdrop-blur-sm sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-gray-700">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  id="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
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

            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-gray-700">Confirmer le mot de passe</label>
              <input
                id="confirm-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez le mot de passe"
                className="block h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 active:bg-blue-800">
              {loading ? <LoadingSpinner size="sm" /> : 'Enregistrer le mot de passe'}
            </button>
          </form>

          {error && error.includes('expiré') && (
            <div className="mt-4 text-center">
              <button onClick={() => navigate('/login')}
                className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Retourner à la page de connexion
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">{APP_NAME} v1.0.0</p>
      </div>
    </div>
  )
}
