// --- RdivExport - Auth Hook -------------------------------------------------
// Gestion de l'authentification via React Context + useReducer.
// Fournit login, logout, initialisation automatique et ecoute onAuthStateChange.

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types'
import * as authService from '@/services/auth.service'

// --- State -------------------------------------------------------------------

export interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
  initialized: boolean
}

// --- Actions -----------------------------------------------------------------

type AuthAction =
  | { type: 'AUTH_INIT_START' }
  | { type: 'AUTH_INIT_SUCCESS'; payload: { user: User; profile: Profile } }
  | { type: 'AUTH_INIT_FAILURE'; payload: string }
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; profile: Profile } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT_SUCCESS' }
  | { type: 'SET_PROFILE'; payload: Profile | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_ERROR'; payload: string }

// --- Reducer -----------------------------------------------------------------

const initialState: AuthState = {
  user: null,
  profile: null,
  loading: true,
  error: null,
  initialized: false,
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_INIT_START':
      return { ...state, loading: true, error: null }

    case 'AUTH_INIT_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        profile: action.payload.profile,
        loading: false,
        error: null,
        initialized: true,
      }

    case 'AUTH_INIT_FAILURE':
      return {
        ...state,
        user: null,
        profile: null,
        loading: false,
        error: action.payload,
        initialized: true,
      }

    case 'LOGIN_START':
      return { ...state, loading: true, error: null }

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        profile: action.payload.profile,
        loading: false,
        error: null,
      }

    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        profile: null,
        loading: false,
        error: action.payload,
      }

    case 'LOGOUT_SUCCESS':
      return {
        ...initialState,
        loading: false,
        initialized: true,
      }

    case 'SET_PROFILE':
      return { ...state, profile: action.payload }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    case 'SET_ERROR':
      return { ...state, error: action.payload }

    default:
      return state
  }
}

// --- Context -----------------------------------------------------------------

interface AuthContextValue {
  state: AuthState
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// --- Provider ----------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Initialize auth on mount: check existing session, fetch profile
  useEffect(() => {
    let cancelled = false

    async function initialize() {
      dispatch({ type: 'AUTH_INIT_START' })

      try {
        const { session, error: sessionError } = await authService.getSession()

        if (cancelled) return

        if (sessionError || !session?.user) {
          dispatch({
            type: 'AUTH_INIT_FAILURE',
            payload: sessionError ?? 'Aucune session active',
          })
          return
        }

        const { profile, error: profileError } = await authService.getCurrentProfile(
          session.user.id as string
        )

        if (cancelled) return

        if (profileError || !profile) {
          dispatch({
            type: 'AUTH_INIT_FAILURE',
            payload: profileError ?? 'Profil introuvable',
          })
          return
        }

        dispatch({
          type: 'AUTH_INIT_SUCCESS',
          payload: { user: session.user, profile },
        })
      } catch (err) {
        if (cancelled) return
        const message =
          err instanceof Error ? err.message : "Erreur lors de l'initialisation"
        dispatch({ type: 'AUTH_INIT_FAILURE', payload: message })
      }
    }

    initialize()

    return () => {
      cancelled = true
    }
  }, [])

  // Listen for auth state changes (login in another tab, token refresh, etc.)
  useEffect(() => {
    const { data: subscription } = authService.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { profile } = await authService.getCurrentProfile(
            session.user.id as string
          )
          if (profile) {
            dispatch({
              type: 'AUTH_INIT_SUCCESS',
              payload: { user: session.user, profile },
            })
          }
        } else {
          dispatch({ type: 'LOGOUT_SUCCESS' })
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'LOGIN_START' })

    const result = await authService.login(email, password)

    if (result.error || !result.user || !result.profile) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: result.error ?? 'Erreur lors de la connexion',
      })
      return
    }

    dispatch({
      type: 'LOGIN_SUCCESS',
      payload: { user: result.user, profile: result.profile },
    })
  }, [])

  const logout = useCallback(async () => {
    const { error } = await authService.logout()

    if (error) {
      dispatch({ type: 'SET_ERROR', payload: error })
      return
    }

    dispatch({ type: 'LOGOUT_SUCCESS' })
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ state, login, logout, clearError }),
    [state, login, logout, clearError]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// --- Hook --------------------------------------------------------------------

/**
 * Hook d'acces au contexte d'authentification.
 * Doit etre utilise a l'interieur d'un <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth doit etre utilise a l'interieur d'un <AuthProvider>")
  }
  return context
}
