import React, { useState } from 'react'
import { Calendar, DollarSign, Clock, TrendingUp, Award } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const StaffManagement = ({ staffMember }) => {
  const { darkMode } = useTheme()
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'performance', label: 'Performance' },
    { id: 'attendance', label: 'Attendance' }
  ]

  const attendanceData = [
    { month: 'January', present: 22, absent: 0, leave: 1 },
    { month: 'February', present: 20, absent: 1, leave: 2 },
    { month: 'March', present: 23, absent: 0, leave: 0 },
    { month: 'April', present: 21, absent: 1, leave: 1 },
    { month: 'May', present: 22, absent: 0, leave: 1 },
    { month: 'June', present: 23, absent: 0, leave: 0 }
  ]

  const performanceMetrics = [
    { metric: 'Punctuality', score: 95, color: 'from-green-600 to-emerald-600' },
    { metric: 'Quality of Work', score: 92, color: 'from-blue-600 to-cyan-600' },
    { metric: 'Team Collaboration', score: 88, color: 'from-purple-600 to-pink-600' },
    { metric: 'Patient Satisfaction', score: 90, color: 'from-orange-600 to-red-600' }
  ]

  return (
    <div className="space-y-6">
      {/* Staff Header */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6`}>
        <div className="flex items-start space-x-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-3xl font-bold">
            {staffMember.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {staffMember.name}
            </h2>
            <p className="text-blue-600 capitalize">{staffMember.role}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-xs text-gray-500">Staff ID</p>
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {staffMember.staffId}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Department</p>
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {staffMember.department}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Shift</p>
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {staffMember.shift}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className="inline-block px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium">
                  {staffMember.status}
                </span>
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
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Annual Salary</p>
                      <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        ₹{staffMember.salary.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Joining Date</p>
                      <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {staffMember.joiningDate}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Experience</p>
                      <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        3 years
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Contact Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {staffMember.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {staffMember.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <p className="text-gray-500">Weekly schedule will be displayed here...</p>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {performanceMetrics.map((metric, index) => (
                  <div key={index} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {metric.metric}
                      </span>
                      <span className="text-lg font-bold text-blue-600">{metric.score}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`bg-gradient-to-r ${metric.color} h-2 rounded-full transition-all`}
                        style={{ width: `${metric.score}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center space-x-3 mb-3">
                  <Award className="w-6 h-6 text-yellow-500" />
                  <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Achievements
                  </h4>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2 text-sm">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    <span className="text-gray-600 dark:text-gray-400">Employee of the Month - March 2024</span>
                  </li>
                  <li className="flex items-center space-x-2 text-sm">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    <span className="text-gray-600 dark:text-gray-400">Perfect Attendance - Q1 2024</span>
                  </li>
                  <li className="flex items-center space-x-2 text-sm">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    <span className="text-gray-600 dark:text-gray-400">Best Team Player Award - 2023</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Month</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Present</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Absent</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Leave</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {attendanceData.map((record, index) => {
                      const total = record.present + record.absent + record.leave
                      const percentage = ((record.present / total) * 100).toFixed(1)
                      return (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm">{record.month}</td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium">
                              {record.present}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-medium">
                              {record.absent}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs font-medium">
                              {record.leave}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-center font-semibold text-blue-600">
                            {percentage}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StaffManagement