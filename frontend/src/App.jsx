import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import ProtectedRoute from './components/common/ProtectedRoute'
import FloatingChatbot from './components/common/FloatingChatbot'
import { useAuth } from './context/AuthContext'
import { useTheme } from './context/ThemeContext'

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
          <Route path="/patients"   element={<ProtectedRoute allowedRoles={['Admin','Doctor','Nurse','Receptionist','Patient','Lab Technician','Ward Manager']}><Patients /></ProtectedRoute>} />
          <Route path="/doctors"    element={<ProtectedRoute><Doctors /></ProtectedRoute>} />
          <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
          <Route path="/wards"      element={<ProtectedRoute allowedRoles={['Admin','Doctor','Nurse','Ward Manager']}><Wards /></ProtectedRoute>} />
          <Route path="/pharmacy"   element={<ProtectedRoute allowedRoles={['Admin','Pharmacist']}><Pharmacy /></ProtectedRoute>} />
          <Route path="/prescriptions" element={<ProtectedRoute allowedRoles={['Admin','Doctor','Nurse','Patient','Pharmacist']}><Prescriptions /></ProtectedRoute>} />

          <Route path="/billing"    element={<ProtectedRoute allowedRoles={['Admin','Receptionist','Patient','Pharmacist']}><Billing /></ProtectedRoute>} />
          <Route path="/staff"      element={<ProtectedRoute allowedRoles={['Admin']}><Staff /></ProtectedRoute>} />
          <Route path="/reports"    element={<ProtectedRoute allowedRoles={['Admin']}><Reports /></ProtectedRoute>} />
          <Route path="/test-reports" element={<ProtectedRoute allowedRoles={['Patient','Doctor','Nurse','Admin','Lab Technician']}><TestReports /></ProtectedRoute>} />
          <Route path="/settings"   element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/profile"    element={<ProtectedRoute><Profile /></ProtectedRoute>} />

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
