import React, { useState } from 'react'
import { Bed, User, Calendar, Activity, AlertCircle } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const BedManagement = ({ beds, onAssignPatient, onDischarge }) => {
  const { darkMode } = useTheme()
  const [filterStatus, setFilterStatus] = useState('all') // all, occupied, available
  const [filterWard, setFilterWard] = useState('all')

  const wards = [...new Set(beds.map(b => b.ward))]
  const inp = `px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`

  const filteredBeds = beds.filter(bed => {
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'occupied' && bed.patient) ||
      (filterStatus === 'available' && !bed.patient)
    const matchesWard = filterWard === 'all' || bed.ward === filterWard
    return matchesStatus && matchesWard
  })

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'Critical':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20'
      case 'Stable':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20'
      case 'Moderate':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      default:
        return 'border-gray-300 dark:border-gray-700'
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center space-x-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={inp}
        >
          <option value="all">All Beds</option>
          <option value="occupied">Occupied</option>
          <option value="available">Available</option>
        </select>
        <select
          value={filterWard}
          onChange={(e) => setFilterWard(e.target.value)}
          className={inp}
        >
          <option value="all">All Wards</option>
          {wards.map((ward) => (
            <option key={ward} value={ward}>{ward}</option>
          ))}
        </select>
      </div>

      {/* Beds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredBeds.map((bed) => (
          <div
            key={bed.id}
            className={`p-4 rounded-lg border-2 transition ${
              bed.patient
                ? getConditionColor(bed.condition)
                : darkMode
                ? 'border-gray-700 bg-gray-800'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Bed className={`w-5 h-5 ${
                  bed.patient
                    ? bed.condition === 'Critical'
                      ? 'text-red-600'
                      : bed.condition === 'Stable'
                      ? 'text-green-600'
                      : 'text-yellow-600'
                    : 'text-gray-400'
                }`} />
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {bed.id}
                </span>
              </div>
              {bed.patient && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  bed.condition === 'Critical'
                    ? 'bg-red-100 text-red-700'
                    : bed.condition === 'Stable'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {bed.condition}
                </span>
              )}
            </div>

            <p className="text-xs text-gray-500 mb-2">{bed.ward}</p>

            {bed.patient ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {bed.patient}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>Age: {bed.age}</span>
                  <span>•</span>
                  <span>{bed.gender}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span>Admitted: {bed.admissionDate}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Dr. {bed.doctor}
                </p>
                <button
                  onClick={() => onDischarge(bed.id)}
                  className="w-full mt-2 py-1.5 bg-[#2E86DE] text-white rounded-xl text-xs hover:bg-[#1a6db5] transition-all duration-200"
                >
                  Discharge Patient
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-green-600 dark:text-green-400 font-semibold text-sm mb-2">
                  Available
                </p>
                <button
                  onClick={() => onAssignPatient(bed.id)}
                  className="w-full py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition"
                >
                  Assign Patient
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default BedManagement