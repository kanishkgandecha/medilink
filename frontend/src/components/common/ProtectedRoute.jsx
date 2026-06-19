import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import TopNav from './TopNav'
import BottomNav from './BottomNav'
import Loader from './Loader'
import { useTheme } from '../../context/ThemeContext'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth()
  const { darkMode }      = useTheme()
  const location          = useLocation()

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
    <div className={`flex flex-col h-screen overflow-hidden
      ${darkMode
        ? 'bg-gray-900'
        : 'bg-gradient-to-br from-[#F9F8F4] via-[#F5F7FA] to-[#EFF4FC]'}`}>

      <TopNav />

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div
          key={location.pathname}
          className="p-6 pb-24 md:pb-6 min-h-full animate-enter"
        >
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}

export default ProtectedRoute
