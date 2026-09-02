import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import ProtectedRoute from './components/common/ProtectedRoute'
import FloatingChatbot from './components/common/FloatingChatbot'
import { useAuth } from './context/AuthContext'
import { useTheme } from './context/ThemeContext'
import { ROUTE_ROLES } from './config/rolePolicy'

// Auth pages — small, load eagerly (shown before auth)
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

// Main pages — lazy loaded on demand
const Dashboard     = lazy(() => import('./pages/Dashboard'))
const Patients      = lazy(() => import('./pages/Patients'))
const Doctors       = lazy(() => import('./pages/Doctors'))
const Appointments  = lazy(() => import('./pages/Appointments'))
const Wards         = lazy(() => import('./pages/Wards'))
const Pharmacy      = lazy(() => import('./pages/Pharmacy'))
const Prescriptions = lazy(() => import('./pages/Prescriptions'))
const Billing       = lazy(() => import('./pages/Billing'))
const Staff         = lazy(() => import('./pages/Staff'))
const Reports       = lazy(() => import('./pages/Reports'))
const Settings      = lazy(() => import('./pages/Settings'))
const TestReports   = lazy(() => import('./pages/TestReports'))
const Profile       = lazy(() => import('./pages/Profile'))
const AIAgents      = lazy(() => import('./pages/AIAgents'))
const AccessDenied  = lazy(() => import('./pages/AccessDenied'))

// Page-level loading fallback — matches app chrome (no layout shift)
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400 font-medium">Loading…</p>
    </div>
  </div>
)

function App() {
  const { user } = useAuth()
  const { darkMode } = useTheme()

  return (
    <div className={darkMode ? 'dark' : ''}>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={darkMode ? 'dark' : 'light'}
      />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login"              element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register"           element={user ? <Navigate to="/dashboard" /> : <Register />} />
          <Route path="/forgot-password"    element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/patients"   element={<ProtectedRoute allowedRoles={ROUTE_ROLES.patients}><Patients /></ProtectedRoute>} />
          <Route path="/doctors"    element={<ProtectedRoute allowedRoles={ROUTE_ROLES.doctors}><Doctors /></ProtectedRoute>} />
          <Route path="/appointments" element={<ProtectedRoute allowedRoles={ROUTE_ROLES.appointments}><Appointments /></ProtectedRoute>} />
          <Route path="/wards"      element={<ProtectedRoute allowedRoles={ROUTE_ROLES.wards}><Wards /></ProtectedRoute>} />
          <Route path="/pharmacy"   element={<ProtectedRoute allowedRoles={ROUTE_ROLES.pharmacy}><Pharmacy /></ProtectedRoute>} />
          <Route path="/prescriptions" element={<ProtectedRoute allowedRoles={ROUTE_ROLES.prescriptions}><Prescriptions /></ProtectedRoute>} />

          <Route path="/billing"    element={<ProtectedRoute allowedRoles={ROUTE_ROLES.billing}><Billing /></ProtectedRoute>} />
          <Route path="/staff"      element={<ProtectedRoute allowedRoles={ROUTE_ROLES.staff}><Staff /></ProtectedRoute>} />
          <Route path="/reports"    element={<ProtectedRoute allowedRoles={ROUTE_ROLES.reports}><Reports /></ProtectedRoute>} />
          <Route path="/test-reports" element={<ProtectedRoute allowedRoles={ROUTE_ROLES.testReports}><TestReports /></ProtectedRoute>} />
          <Route path="/settings"   element={<ProtectedRoute allowedRoles={ROUTE_ROLES.account}><Settings /></ProtectedRoute>} />
          <Route path="/profile"    element={<ProtectedRoute allowedRoles={ROUTE_ROLES.account}><Profile /></ProtectedRoute>} />
          <Route path="/access-denied" element={<ProtectedRoute><AccessDenied /></ProtectedRoute>} />

          {/* AI Agent Suite Routes */}
          <Route path="/ai-agents"  element={<ProtectedRoute allowedRoles={ROUTE_ROLES.aiAgents}><AIAgents /></ProtectedRoute>} />
          <Route path="/symptom-checker" element={<Navigate to="/ai-agents?tab=symptom-checker" replace />} />
          <Route path="/bed-allocation"  element={<Navigate to="/ai-agents?tab=bed-allocation" replace />} />
          <Route path="/health-risk"     element={<Navigate to="/ai-agents?tab=health-risk" replace />} />
          <Route path="/report-analyzer" element={<Navigate to="/ai-agents?tab=report-analyzer" replace />} />
          <Route path="/appointment-optimizer" element={<Navigate to="/ai-agents?tab=appointment-optimizer" replace />} />
          <Route path="/patient-summary" element={<Navigate to="/ai-agents?tab=patient-summary" replace />} />

          {/* Default */}
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>

      {user && <FloatingChatbot />}
    </div>
  )
}

export default App
