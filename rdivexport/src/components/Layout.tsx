// ─── RdivExport – Layout principal ──────────────────────────────────────────
// Mise en page mobile-first avec header fixe, zone de contenu scrollable et
// barre de navigation inférieure fixe (safe-area-inset-bottom).

import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { getInitials } from '@/utils/formatters'
import type { Role } from '@/types'

// ─── Navigation par rôle ────────────────────────────────────────────────────

interface NavItem {
  label: string
  path: string
  icon: ReactNode
}

function getNavItems(role: Role): NavItem[] {
  if (role === 'centralisateur') {
    return [
      {
        label: 'Réquisitions',
        path: '/centralisateur',
        icon: (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
          </svg>
        ),
      },
      {
        label: 'Profil',
        path: '/profil',
        icon: (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        ),
      },
    ]
  }

  if (role === 'depot_user') {
    return [
      {
        label: 'Stock',
        path: '/depot/stock',
        icon: (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        ),
      },
      {
        label: 'Livraison',
        path: '/admin/delivery',
        icon: (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
        ),
      },
      {
        label: 'Profil',
        path: '/profil',
        icon: (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        ),
      },
    ]
  }

  if (role === 'main_requisitionist') {
    return [
      {
        label: 'Tableau de bord',
        path: '/admin',
        icon: (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
          </svg>
        ),
      },
      {
        label: 'Consolidation',
        path: '/admin/consolidation',
        icon: (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
          </svg>
        ),
      },
      {
        label: 'Livraison',
        path: '/admin/delivery',
        icon: (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
        ),
      },
      {
        label: 'Profil',
        path: '/profil',
        icon: (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        ),
      },
    ]
  }

  // pharmacy_user (default)
  return [
    {
      label: 'Accueil',
      path: '/dashboard',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      label: 'Réquisition',
      path: '/requisition/new',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      ),
    },
    {
      label: 'Historique',
      path: '/historique',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      label: 'Profil',
      path: '/profil',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      ),
    },
  ]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Détermine si un chemin de navigation est « actif » pour la mise en surbrillance. */
function isNavActive(currentPath: string, navPath: string): boolean {
  if (navPath === '/dashboard' || navPath === '/admin') {
    return currentPath === navPath
  }
  return currentPath.startsWith(navPath)
}

// ─── Composant ──────────────────────────────────────────────────────────────

export function Layout({ children }: { children?: ReactNode }) {
  const { state, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { canInstall, isIOS, promptInstall } = usePWAInstall()
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  const profile = state.profile
  const role = profile?.role ?? 'pharmacy_user'
  const fullName = profile?.full_name ?? ''
  const initials = getInitials(fullName)

  const navItems = getNavItems(role)

  // Afficher le bandeau d'installation après 3 secondes
  useEffect(() => {
    if (!canInstall && !isIOS) return
    const timer = setTimeout(() => {
      if (canInstall || isIOS) setShowInstallBanner(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [canInstall, isIOS])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* ── Header fixe ── */}
      <header className="fixed top-0 z-40 w-full border-b border-gray-200 bg-white">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Nom de l'application */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9.75m3 0h3m-3 0v3m0-3v-3m-3 0h3" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">RdivExport</span>
          </div>

          {/* Avatar + Déconnexion */}
          <div className="flex items-center gap-3">
            {/* Paramètres (superviseur uniquement) */}
          {role === 'main_requisitionist' && (
            <button
              onClick={() => navigate('/admin/settings')}
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Paramètres"
              title="Paramètres"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </button>
          )}

            {/* Avatar initiales */}
            <button
              onClick={() => navigate('/profil')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Voir le profil"
            >
              {initials}
            </button>

            {/* Bouton déconnexion */}
            <button
              onClick={handleLogout}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Bandeau PWA Install ── */}
      {showInstallBanner && (canInstall || isIOS) && (
        <div className="fixed top-14 left-0 right-0 z-30 border-b border-blue-200 bg-blue-600 px-4 py-2.5 text-center">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
            <p className="flex-1 text-xs font-medium text-white">
              {isIOS
                ? 'Installez RdivExport : appuyez sur Partager > Sur l\'écran d\'accueil'
                : 'Installez RdivExport sur votre appareil'}
            </p>
            <div className="flex gap-2">
              {canInstall && (
                <button onClick={() => { promptInstall(); setShowInstallBanner(false) }}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm">
                  Installer
                </button>
              )}
              <button onClick={() => setShowInstallBanner(false)}
                className="rounded-lg bg-blue-500 px-2 py-1.5 text-xs font-medium text-white">
                </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Zone de contenu principal ── */}
      <main className={`flex-1 px-4 pb-24 ${showInstallBanner ? 'pt-[7.5rem]' : 'pt-[4.5rem]'}`}>
        {children ?? <Outlet />}
      </main>

      {/* ── Barre de navigation inférieure ── */}
      <nav className="fixed bottom-0 z-40 w-full border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <ul className="flex items-center justify-around">
          {navItems.map((item) => {
            const active = isNavActive(location.pathname, item.path)

            return (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`flex min-h-[56px] w-full min-w-[64px] flex-col items-center justify-center gap-0.5 px-1 transition-colors focus:outline-none ${
                    active
                      ? 'text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className={active ? 'scale-110 transition-transform' : ''}>
                    {item.icon}
                  </span>
                  <span className={`text-[10px] leading-tight ${active ? 'font-semibold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
