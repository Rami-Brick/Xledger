import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider'
import { RoleProvider, useRole  } from '@/lib/RoleProvider'
import { Toaster } from '@/components/ui/sonner'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/components/AppLayout'
import LoginPage from '@/features/auth/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import AddTransactionPage from '@/pages/AddTransactionPage'
import HistoryPage from '@/pages/HistoryPage'
import CategoriesPage from '@/pages/CategoriesPage'
import SalariesPage from '@/pages/SalariesPage'
import ReportsPage from '@/pages/ReportsPage'
import LogsPage from '@/pages/LogsPage'
import EmployeesPage from '@/pages/settings/EmployeesPage'
import FixedChargesPage from '@/pages/settings/FixedChargesPage'
import ProductsPage from '@/pages/settings/ProductsPage'
import SubcategoriesPage from '@/pages/settings/SubcategoriesPage'
import SubscriptionsPage from '@/pages/settings/SubscriptionsPage'
import LoanContactsPage from '@/pages/settings/LoanContactsPage'

function LoginRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  if (user) return <Navigate to="/" replace />
  return <LoginPage />
}

function HomeRedirect() {
  const { canTransact, loading } = useRole()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  return canTransact ? <AddTransactionPage /> : <DashboardPage />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RoleProvider>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<HomeRedirect />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="ajouter" element={<AddTransactionPage />} />
              <Route path="historique" element={<HistoryPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="salaires" element={<SalariesPage />} />
              <Route path="rapports" element={<ReportsPage />} />
              <Route path="logs" element={<LogsPage />} />
              <Route path="parametres/employes" element={<EmployeesPage />} />
              <Route path="parametres/charges-fixes" element={<FixedChargesPage />} />
              <Route path="parametres/produits" element={<ProductsPage />} />
              <Route path="parametres/sous-categories" element={<SubcategoriesPage />} />
              <Route path="parametres/abonnements" element={<SubscriptionsPage />} />
              <Route path="parametres/contacts-prets" element={<LoanContactsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </RoleProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
