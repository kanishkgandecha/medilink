import React, { useState } from 'react'
import { User, Phone, Mail, Calendar, MapPin, FileText, Activity, Pill } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { formatEnumLabel } from '../../utils/format'

const PatientDetails = ({ patient }) => {
  const { darkMode } = useTheme()
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'history', label: 'Medical History' },
    { id: 'prescriptions', label: 'Prescriptions' },
    { id: 'lab', label: 'Lab Results' }
  ]

  return (
    <div className="space-y-6">
      {/* Patient Header */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6`}>
        <div className="flex items-start space-x-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white text-3xl font-bold">
            {patient.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {patient.name}
            </h2>
            <p className="text-gray-500">{patient.patientId}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Age</p>
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {patient.age} years
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Blood Group</p>
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {formatEnumLabel(patient.bloodGroup)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {patient.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {patient.email}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl`}>
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 font-medium transition ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Gender</p>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {patient.gender}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Date of Birth</p>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {patient.dateOfBirth || 'N/A'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500 mb-1">Address</p>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {patient.address || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Emergency Contact</p>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {patient.emergencyContact || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <p className="text-gray-500">Medical history details will be displayed here...</p>
            </div>
          )}

          {activeTab === 'prescriptions' && (
            <div className="space-y-4">
              <p className="text-gray-500">Prescription history will be displayed here...</p>
            </div>
          )}

          {activeTab === 'lab' && (
            <div className="space-y-4">
              <p className="text-gray-500">Lab results will be displayed here...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PatientDetails