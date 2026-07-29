// ─── RdivExport – Application Router ────────────────────────────────────────
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/Layout'

// ─── Pages ────────────────────────────────────────────────────────────────────
import LoginPage from '@/pages/LoginPage'
import PharmacyDashboard from '@/pages/PharmacyDashboard'
import CreateRequisitionPage from '@/pages/CreateRequisitionPage'
import RequisitionDetailPage from '@/pages/RequisitionDetailPage'
import RequisitionHistoryPage from '@/pages/RequisitionHistoryPage'
import ProfilePage from '@/pages/ProfilePage'
import AdminDashboard from '@/pages/AdminDashboard'
import ConsolidationPage from '@/pages/ConsolidationPage'
import DeliveryChecklistPage from '@/pages/DeliveryChecklistPage'

// ─── Composant Router ────────────────────────────────────────────────────────
export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Route publique : Connexion ── */}
          <Route path="/login" element={<LoginPage />} />

          {/* ── Routes protégées avec Layout (pharmacy_user) ── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <PharmacyDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/requisition/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateRequisitionPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/requisition/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <RequisitionDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/historique"
            element={
              <ProtectedRoute>
                <Layout>
                  <RequisitionHistoryPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* ── Route profil (accessible par tous les rôles) ── */}
          <Route
            path="/profil"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProfilePage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* ── Routes protégées admin (main_requisitionist) ── */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/consolidation"
            element={
              <ProtectedRoute>
                <Layout>
                  <ConsolidationPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/delivery/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <DeliveryChecklistPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* ── Route par défaut : redirection vers login ── */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
