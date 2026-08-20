// RdivExport - Application Router
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/Layout'

// Pages
import LoginPage from '@/pages/LoginPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import PharmacyDashboard from '@/pages/PharmacyDashboard'
import CreateRequisitionPage from '@/pages/CreateRequisitionPage'
import RequisitionDetailPage from '@/pages/RequisitionDetailPage'
import RequisitionHistoryPage from '@/pages/RequisitionHistoryPage'
import ProfilePage from '@/pages/ProfilePage'
import AdminDashboard from '@/pages/AdminDashboard'
import ConsolidationPage from '@/pages/ConsolidationPage'
import DeliveryListPage from '@/pages/DeliveryListPage'
import DeliveryChecklistPage from '@/pages/DeliveryChecklistPage'
import SettingsPage from '@/pages/SettingsPage'
import DepotStockPage from '@/pages/DepotStockPage'
import DepotProductsPage from '@/pages/DepotProductsPage'
import CentralisateurDashboard from '@/pages/CentralisateurDashboard'
import StatsPage from '@/pages/StatsPage'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Routes pharmacy_user */}
          <Route path="/dashboard" element={<ProtectedRoute><Layout><PharmacyDashboard /></Layout></ProtectedRoute>} />
          <Route path="/requisition/new" element={<ProtectedRoute><Layout><CreateRequisitionPage /></Layout></ProtectedRoute>} />
          <Route path="/requisition/:id" element={<ProtectedRoute><Layout><RequisitionDetailPage /></Layout></ProtectedRoute>} />
          <Route path="/historique" element={<ProtectedRoute><Layout><RequisitionHistoryPage /></Layout></ProtectedRoute>} />
          <Route path="/profil" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />

          {/* Routes centralisateur */}
          <Route path="/centralisateur" element={<ProtectedRoute><Layout><CentralisateurDashboard /></Layout></ProtectedRoute>} />

          {/* Routes admin (superviseur) */}
          <Route path="/admin" element={<ProtectedRoute><Layout><AdminDashboard /></Layout></ProtectedRoute>} />
          <Route path="/admin/consolidation" element={<ProtectedRoute><Layout><ConsolidationPage /></Layout></ProtectedRoute>} />
          <Route path="/admin/delivery" element={<ProtectedRoute><Layout><DeliveryListPage /></Layout></ProtectedRoute>} />
          <Route path="/admin/delivery/:id" element={<ProtectedRoute><Layout><DeliveryChecklistPage /></Layout></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
          <Route path="/admin/stats" element={<ProtectedRoute><Layout><StatsPage /></Layout></ProtectedRoute>} />

          {/* Routes dépôt */}
          <Route path="/depot/stock" element={<ProtectedRoute><Layout><DepotStockPage /></Layout></ProtectedRoute>} />
          <Route path="/depot/products" element={<ProtectedRoute><Layout><DepotProductsPage /></Layout></ProtectedRoute>} />
          <Route path="/depot/requisition" element={<ProtectedRoute><Layout><CreateRequisitionPage /></Layout></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}