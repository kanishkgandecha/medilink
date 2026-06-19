import React, { useState } from 'react'
import { Calendar, Clock, User, MapPin, Phone, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const AppointmentList = ({ appointments, onEdit, onDelete, onStatusChange }) => {
  const { darkMode } = useTheme()
  const [filter, setFilter] = useState('all') // all, today, upcoming, completed

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'completed':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const filteredAppointments = appointments.filter(apt => {
    const today = new Date().toISOString().split('T')[0]
    switch (filter) {
      case 'today':
        return apt.date === today
      case 'upcoming':
        return apt.date >= today && apt.status !== 'completed'
      case 'completed':
        return apt.status === 'completed'
      default:
        return true
    }
  })

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex space-x-2">
        {['all', 'today', 'upcoming', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f
                ? 'bg-[#2E86DE] text-white'
                : darkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {filteredAppointments.length === 0 ? (
          <div className={`p-8 text-center rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">No appointments found</p>
          </div>
        ) : (
          filteredAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className={`p-4 rounded-lg border ${
                darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-white'
              } hover:shadow-md transition`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-semibold">
                      {appointment.patient.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {appointment.patient}
                      </p>
                      <p className="text-sm text-gray-500">{appointment.doctor}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>{appointment.date}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{appointment.time}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <MapPin className="w-4 h-4" />
                      <span>{appointment.location || 'OPD'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <Phone className="w-4 h-4" />
                      <span>{appointment.phone || 'N/A'}</span>
                    </div>
                  </div>

                  {appointment.reason && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Reason: {appointment.reason}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end space-y-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(appointment.status)}`}>
                    {appointment.status}
                  </span>

                  <div className="flex space-x-2">
                    {appointment.status === 'pending' && (
                      <>
                        <button
                          onClick={() => onStatusChange(appointment.id, 'confirmed')}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition"
                          title="Confirm"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onStatusChange(appointment.id, 'cancelled')}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                          title="Cancel"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => onEdit(appointment)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(appointment.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default AppointmentList