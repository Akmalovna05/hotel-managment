import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Provider, useSelector } from 'react-redux'
import AuthBootstrap from './components/auth/AuthBootstrap'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { store } from './store'
import ProtectedRoute from './components/auth/ProtectedRoute'
import DashboardLayout from './components/layout/DashboardLayout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import RoomsPage from './pages/RoomsPage'
import BookingsPage from './pages/BookingsPage'
import GuestsPage from './pages/GuestsPage'
import HousekeepingPage from './pages/HousekeepingPage'
import MaintenancePage from './pages/MaintenancePage'
import StaffPage from './pages/StaffPage'
import PaymentsDashboard from './pages/payments/PaymentsDashboard'
import InvoiceDetailPage from './pages/payments/InvoiceDetailPage'
import SettingsPage from './pages/SettingsPage'
import PublicLayout from './components/public/PublicLayout'
import BookHomePage from './pages/public/BookHomePage'
import RoomBookPage from './pages/public/RoomBookPage'
import CheckoutPage from './pages/public/CheckoutPage'
import BookingSuccessPage from './pages/public/BookingSuccessPage'
import BookingFailedPage from './pages/public/BookingFailedPage'
import GuestPaymentHistoryPage from './pages/public/GuestPaymentHistoryPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
})

function AppRoutes() {
  const isAuth = useSelector((s) => s.auth.isAuthenticated)

  return (
    <Routes>
      <Route path="/book" element={<PublicLayout />}>
        <Route index element={<BookHomePage />} />
        <Route path=":roomId" element={<RoomBookPage />} />
      </Route>
      <Route path="/checkout/:reference" element={<PublicLayout />}>
        <Route index element={<CheckoutPage />} />
      </Route>
      <Route path="/booking/success/:reference" element={<PublicLayout />}>
        <Route index element={<BookingSuccessPage />} />
      </Route>
      <Route path="/booking/failed/:reference" element={<PublicLayout />}>
        <Route index element={<BookingFailedPage />} />
      </Route>
      <Route path="/booking/history/:reference" element={<PublicLayout />}>
        <Route index element={<GuestPaymentHistoryPage />} />
      </Route>
      <Route path="/login" element={isAuth ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/register" element={isAuth ? <Navigate to="/dashboard" /> : <RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="bookings" element={<ProtectedRoute roles={['admin', 'manager', 'receptionist']}><BookingsPage /></ProtectedRoute>} />
        <Route path="guests" element={<ProtectedRoute roles={['admin', 'manager', 'receptionist']}><GuestsPage /></ProtectedRoute>} />
        <Route path="housekeeping" element={<ProtectedRoute roles={['admin', 'manager', 'housekeeping']}><HousekeepingPage /></ProtectedRoute>} />
        <Route path="maintenance" element={<ProtectedRoute roles={['admin', 'manager', 'maintenance']}><MaintenancePage /></ProtectedRoute>} />
        <Route path="staff" element={<ProtectedRoute roles={['admin', 'manager']}><StaffPage /></ProtectedRoute>} />
        <Route path="payments" element={<ProtectedRoute roles={['admin', 'manager', 'receptionist']}><PaymentsDashboard /></ProtectedRoute>} />
        <Route path="payments/invoices/:id" element={<ProtectedRoute roles={['admin', 'manager', 'receptionist']}><InvoiceDetailPage /></ProtectedRoute>} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuth ? '/dashboard' : '/book'} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthBootstrap />
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  )
}
