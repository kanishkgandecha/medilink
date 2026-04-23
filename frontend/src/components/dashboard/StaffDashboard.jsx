import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import NurseDashboard from './NurseDashboard'
import ReceptionistDashboard from './ReceptionistDashboard'
import PharmacistDashboard from './PharmacistDashboard'

const GenericStaffDashboard = ({ subRole, links }) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{subRole} Dashboard</h1>
      <p className="text-sm text-gray-500 mt-0.5">Welcome back. Use the sidebar or quick links below to navigate.</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {links.map(({ label, path, description }) => (
        <Link
          key={path}
          to={path}
          className="block p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all"
        >
          <p className="font-semibold text-gray-800 dark:text-white">{label}</p>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </Link>
      ))}
    </div>
  </div>
)

const StaffDashboard = () => {
  const { user } = useAuth()
  const sub = (user?.subRole || user?.role || '').toLowerCase()

  switch (sub) {
    case 'nurse':
      return <NurseDashboard />
    case 'receptionist':
      return <ReceptionistDashboard />
    case 'pharmacist':
      return <PharmacistDashboard />
    case 'lab technician':
      return (
        <GenericStaffDashboard
          subRole="Lab Technician"
          links={[
            { label: 'Test Reports', path: '/test-reports', description: 'View and upload patient lab reports' },
            { label: 'Patients', path: '/patients', description: 'Browse patient records' },
          ]}
        />
      )
    case 'ward manager':
      return (
        <GenericStaffDashboard
          subRole="Ward Manager"
          links={[
            { label: 'Wards & Beds', path: '/wards', description: 'Manage ward allocations and bed status' },
            { label: 'Patients', path: '/patients', description: 'Browse admitted patients' },
          ]}
        />
      )
    default:
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-gray-500 font-semibold">Staff Dashboard</p>
            <p className="text-gray-400 text-sm mt-1">Contact your administrator to configure your role.</p>
          </div>
        </div>
      )
  }
}

export default StaffDashboard
