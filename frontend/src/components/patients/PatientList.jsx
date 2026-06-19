import React, { useState } from 'react'
import { Search, Filter, ChevronDown } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const PatientList = ({ patients, onPatientSelect }) => {
  const { darkMode } = useTheme()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState('all')
  const inp = `px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.patientId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterBy === 'all' || patient.bloodGroup === filterBy
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
            placeholder="Search by name or ID..."
            className={`w-full pl-10 pr-4 ${inp}`}
          />
        </div>
        <select
          value={filterBy}
          onChange={(e) => setFilterBy(e.target.value)}
          className={inp}
        >
          <option value="all">All Blood Groups</option>
          <option value="A+">A+</option>
          <option value="A-">A-</option>
          <option value="B+">B+</option>
          <option value="B-">B-</option>
          <option value="AB+">AB+</option>
          <option value="AB-">AB-</option>
          <option value="O+">O+</option>
          <option value="O-">O-</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatients.map((patient) => (
          <div
            key={patient._id}
            onClick={() => onPatientSelect(patient)}
            className={`p-4 rounded-lg border cursor-pointer transition ${
              darkMode 
                ? 'border-gray-700 hover:bg-gray-750' 
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-semibold">
                {patient.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {patient.name}
                </p>
                <p className="text-sm text-gray-500">{patient.patientId}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-500">Age</p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {patient.age}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Blood</p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {patient.bloodGroup}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PatientList