import React from 'react'
import { useAuth } from '../context/AuthContext'
import AdminDashboard from '../components/dashboard/AdminDashboard'
import DoctorDashboard from '../components/dashboard/DoctorDashboard'
import PatientDashboard from '../components/dashboard/PatientDashboard'
import NurseDashboard from '../components/dashboard/NurseDashboard'
import ReceptionistDashboard from '../components/dashboard/ReceptionistDashboard'
import PharmacistDashboard from '../components/dashboard/PharmacistDashboard'
import StaffDashboard from '../components/dashboard/StaffDashboard'
import Loader from '../components/common/Loader'

const Dashboard = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return <Loader fullScreen text="Loading dashboard..." />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">No user data found</p>
      </div>
    )
  }

  // Render dashboard based on user role
  const renderDashboard = () => {
    const role = user.role?.toLowerCase()

    switch (role) {
      case 'admin':
      case 'administrator':
        return <AdminDashboard />
      
      case 'doctor':
        return <DoctorDashboard />
      
      case 'patient':
        return <PatientDashboard />
      
      case 'nurse':
        return <NurseDashboard />
      
      case 'receptionist':
        return <ReceptionistDashboard />

      case 'pharmacist':
        return <PharmacistDashboard />

      case 'staff':
        return <StaffDashboard />

      default:
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <p className="text-red-500 font-semibold mb-2">Invalid User Role</p>
              <p className="text-gray-500">Role: {user.role}</p>
              <p className="text-gray-400 text-sm mt-2">Please contact administrator</p>
            </div>
          </div>
        )
    }
  }

  return (
    <div>
      {renderDashboard()}
    </div>
  )
}

export default Dashboard