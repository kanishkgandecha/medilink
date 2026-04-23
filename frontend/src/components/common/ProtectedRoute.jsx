import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Sidebar from './Sidebar'
import Header from './Header'
import Loader from './Loader'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Loader fullScreen text="Authenticating…" />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(user.role) &&
    !(user.subRole && allowedRoles.includes(user.subRole))
  ) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Sidebar — always rendered; width changes based on sidebarOpen */}
      <Sidebar />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        {/* Scrollable content area with per-page enter animation */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div
            key={location.pathname}
            className="p-6 min-h-full animate-enter"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default ProtectedRoute
