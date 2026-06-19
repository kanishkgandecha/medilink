import React, { useState } from 'react'
import { Search, Star, Calendar, Phone, Mail } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const DoctorList = ({ doctors, onDoctorSelect }) => {
  const { darkMode } = useTheme()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSpecialization, setFilterSpecialization] = useState('all')

  const specializations = [...new Set(doctors.map(d => d.specialization))]
  const inp = `px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`

  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doctor.doctorId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterSpecialization === 'all' || doctor.specialization === filterSpecialization
    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search doctors..."
            className={`w-full pl-10 pr-4 ${inp}`}
          />
        </div>
        <select
          value={filterSpecialization}
          onChange={(e) => setFilterSpecialization(e.target.value)}
          className={inp}
        >
          <option value="all">All Specializations</option>
          {specializations.map((spec) => (
            <option key={spec} value={spec}>{spec}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDoctors.map((doctor) => (
          <div
            key={doctor._id}
            onClick={() => onDoctorSelect(doctor)}
            className={`p-5 rounded-xl border cursor-pointer transition ${
              darkMode 
                ? 'border-gray-700 bg-gray-800 hover:bg-gray-750' 
                : 'border-gray-200 bg-white hover:shadow-lg'
            }`}
          >
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {doctor.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {doctor.name}
                </h3>
                <p className="text-sm text-blue-600">{doctor.specialization}</p>
                <p className="text-xs text-gray-500 mt-1">{doctor.qualification}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Experience:</span>
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {doctor.experience}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Fee:</span>
                <span className="text-sm font-semibold text-green-600">
                  ₹{doctor.consultationFee}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Rating:</span>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{doctor.rating}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex space-x-2">
              <button className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-[#2E86DE] text-white rounded-xl hover:bg-[#1a6db5] transition-all duration-200 text-sm shadow-[0_2px_8px_rgba(46,134,222,0.3)]">
                <Calendar className="w-4 h-4" />
                <span>Book</span>
              </button>
              <button className={`p-2 rounded-lg border ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'} transition`}>
                <Phone className="w-4 h-4" />
              </button>
              <button className={`p-2 rounded-lg border ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'} transition`}>
                <Mail className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DoctorList