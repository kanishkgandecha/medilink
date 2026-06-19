import React, { useState } from 'react'
import { TrendingUp, Users, DollarSign, Activity, Download } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const ReportsAnalytics = () => {
  const { darkMode } = useTheme()
  const [dateRange, setDateRange] = useState('month')
  const inp = `px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`

  const departmentData = [
    { name: 'Cardiology', value: 450, color: '#ef4444' },
    { name: 'Neurology', value: 320, color: '#8b5cf6' },
    { name: 'Orthopedics', value: 380, color: '#3b82f6' },
    { name: 'Pediatrics', value: 520, color: '#10b981' },
    { name: 'General', value: 680, color: '#f59e0b' }
  ]

  const kpiData = [
    {
      title: 'Total Patients',
      value: '2,845',
      change: '+12.5%',
      trend: 'up',
      icon: Users,
      color: 'from-blue-600 to-cyan-600'
    },
    {
      title: 'Revenue',
      value: '$328,450',
      change: '+18.2%',
      trend: 'up',
      icon: DollarSign,
      color: 'from-green-600 to-emerald-600'
    },
    {
      title: 'Occupancy Rate',
      value: '87%',
      change: '+5.3%',
      trend: 'up',
      icon: Activity,
      color: 'from-purple-600 to-pink-600'
    },
    {
      title: 'Patient Satisfaction',
      value: '4.8/5.0',
      change: '+0.3',
      trend: 'up',
      icon: TrendingUp,
      color: 'from-orange-600 to-red-600'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Analytics Dashboard
          </h2>
          <p className="text-gray-500 mt-1">Comprehensive hospital performance metrics</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className={inp}
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button className="flex items-center space-x-2 px-4 py-2 bg-[#2E86DE] text-white rounded-xl hover:bg-[#1a6db5] shadow-[0_2px_8px_rgba(46,134,222,0.35)] transition-all duration-200">
            <Download className="w-5 h-5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <div
              key={index}
              className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium">{kpi.title}</p>
                  <h3 className={`text-3xl font-bold mt-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {kpi.value}
                  </h3>
                  <div className="flex items-center mt-3 space-x-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-500 font-medium">{kpi.change}</span>
                    <span className="text-sm text-gray-500">vs last {dateRange}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg bg-gradient-to-br ${kpi.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Department Distribution */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6`}>
        <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Patient Distribution by Department
        </h3>
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={departmentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {departmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
          {departmentData.map((dept, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }}></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{dept.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performing Doctors */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6`}>
        <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Top Performing Doctors
        </h3>
        <div className="space-y-3">
          {[
            { name: 'Dr. Sarah Wilson', patients: 156, rating: 4.9, specialty: 'Cardiology' },
            { name: 'Dr. Michael Brown', patients: 142, rating: 4.8, specialty: 'Neurology' },
            { name: 'Dr. Emily Chen', patients: 138, rating: 4.7, specialty: 'Orthopedics' },
            { name: 'Dr. James Taylor', patients: 134, rating: 4.8, specialty: 'Pediatrics' }
          ].map((doctor, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {doctor.name}
                    </p>
                    <p className="text-sm text-gray-500">{doctor.specialty}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-blue-600">{doctor.patients} patients</p>
                  <p className="text-xs text-yellow-600">★ {doctor.rating}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ReportsAnalytics