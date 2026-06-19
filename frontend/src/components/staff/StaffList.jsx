import React, { useState } from 'react'
import { Search, Briefcase, User, Phone, Mail } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const StaffList = ({ staff, onStaffSelect }) => {
  const { darkMode } = useTheme()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')

  const roles = [...new Set(staff.map(s => s.role))]
  const inp = `px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.staffId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || member.role === filterRole
    return matchesSearch && matchesRole
  })

  const getRoleColor = (role) => {
    const colors = {
      nurse: 'from-green-600 to-emerald-600',
      receptionist: 'from-blue-600 to-cyan-600',
      pharmacist: 'from-purple-600 to-pink-600',
      'lab technician': 'from-orange-600 to-red-600',
      accountant: 'from-indigo-600 to-purple-600',
      administrator: 'from-yellow-600 to-orange-600'
    }
    return colors[role.toLowerCase()] || 'from-gray-600 to-gray-700'
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search staff..."
            className={`w-full pl-10 pr-4 ${inp}`}
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className={inp}
        >
          <option value="all">All Roles</option>
          {roles.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </div>

      {/* Staff Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((member) => (
          <div
            key={member._id}
            onClick={() => onStaffSelect(member)}
            className={`p-4 rounded-lg border cursor-pointer transition ${
              darkMode 
                ? 'border-gray-700 bg-gray-800 hover:bg-gray-750' 
                : 'border-gray-200 bg-white hover:shadow-lg'
            }`}
          >
            <div className="flex items-start space-x-4 mb-4">
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getRoleColor(member.role)} flex items-center justify-center text-white text-lg font-bold flex-shrink-0`}>
                {member.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-bold truncate ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {member.name}
                </h3>
                <p className="text-sm text-blue-600 capitalize">{member.role}</p
                >
                <p className="text-xs text-gray-500 mt-1">{member.staffId}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Department:</span>
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {member.department}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Shift:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  member.shift === 'Morning'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : member.shift === 'Evening'
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                }`}>
                  {member.shift}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Salary:</span>
                <span className="font-semibold text-green-600">
                  ${member.salary.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex space-x-2">
              <button className={`flex-1 flex items-center justify-center space-x-1 py-2 rounded-lg border ${
                darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'
              } transition text-sm`}>
                <Phone className="w-4 h-4" />
              </button>
              <button className={`flex-1 flex items-center justify-center space-x-1 py-2 rounded-lg border ${
                darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'
              } transition text-sm`}>
                <Mail className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-12">
          <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No staff members found</p>
        </div>
      )}
    </div>
  )
}

export default StaffList