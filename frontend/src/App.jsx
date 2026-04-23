import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// Auth Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

// Main Pages
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import Doctors from './pages/Doctors'
import Appointments from './pages/Appointments'
import Wards from './pages/Wards'
import Pharmacy from './pages/Pharmacy'
import Prescriptions from './pages/Prescriptions'
import Billing from './pages/Billing'
import Staff from './pages/Staff'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import TestReports from './pages/TestReports'

// Components
import ProtectedRoute from './components/common/ProtectedRoute'
import FloatingChatbot from './components/common/FloatingChatbot'
import { useAuth } from './context/AuthContext'
import { useTheme } from './context/ThemeContext'

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
      
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/patients" element={<ProtectedRoute allowedRoles={['Admin','Doctor','Nurse','Receptionist','Patient','Lab Technician','Ward Manager']}><Patients /></ProtectedRoute>} />
        <Route path="/doctors" element={<ProtectedRoute><Doctors /></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
        <Route path="/wards" element={<ProtectedRoute allowedRoles={['Admin','Doctor','Nurse','Ward Manager']}><Wards /></ProtectedRoute>} />
        <Route path="/pharmacy" element={<ProtectedRoute allowedRoles={['Admin','Pharmacist']}><Pharmacy /></ProtectedRoute>} />
        <Route path="/prescriptions" element={<ProtectedRoute allowedRoles={['Admin','Doctor','Nurse','Patient','Pharmacist']}><Prescriptions /></ProtectedRoute>} />
        <Route path="/tasks" element={<Navigate to="/wards" />} />
        <Route path="/billing" element={<ProtectedRoute allowedRoles={['Admin','Receptionist','Patient','Pharmacist']}><Billing /></ProtectedRoute>} />
        <Route path="/staff" element={<ProtectedRoute allowedRoles={['Admin']}><Staff /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={['Admin']}><Reports /></ProtectedRoute>} />
        <Route path="/test-reports" element={<ProtectedRoute allowedRoles={['Patient','Doctor','Nurse','Admin','Lab Technician']}><TestReports /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        {/* Default Route */}
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {user && <FloatingChatbot />}
    </div>
  )
}

export default App