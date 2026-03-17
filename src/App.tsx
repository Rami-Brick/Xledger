import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { Toaster } from '@/components/ui/sonner'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/components/AppLayout'
import LoginPage from '@/features/auth/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import AddTransactionPage from '@/pages/AddTransactionPage'
import HistoryPage from '@/pages/HistoryPage'
import SalariesPage from '@/pages/SalariesPage'
import ReportsPage from '@/pages/ReportsPage'
import EmployeesPage from '@/pages/settings/EmployeesPage'
import FixedChargesPage from '@/pages/settings/FixedChargesPage'
import ProductsPage from '@/pages/settings/ProductsPage'
import SubcategoriesPage from '@/pages/settings/SubcategoriesPage'
import SubscriptionsPage from '@/pages/settings/SubscriptionsPage'
import LoanContactsPage from '@/pages/settings/LoanContactsPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="ajouter" element={<AddTransactionPage />} />
            <Route path="historique" element={<HistoryPage />} />
            <Route path="salaires" element={<SalariesPage />} />
            <Route path="rapports" element={<ReportsPage />} />
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
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App