import React, { useEffect, useState } from 'react'
import { Users, Calendar, Bed, IndianRupee, Activity, AlertCircle, TrendingUp, Stethoscope } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import StatCard from '../common/StatCard'
import { SkeletonDashboard } from '../common/SkeletonCard'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { getAdminDashboard } from '../../services/dashboardService'
import { toast } from 'react-toastify'

const STATUS_COLORS = {
  Confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Completed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const CustomTooltip = ({ active, payload, label, darkMode }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={`px-4 py-3 rounded-xl border shadow-lg text-sm ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800'}`}>
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.name === 'Revenue' ? `₹${Number(p.value).toLocaleString()}` : p.value}</span></p>
      ))}
    </div>
  )
}

const AdminDashboard = () => {
  const { darkMode } = useTheme()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await getAdminDashboard()
        setDashboard(res.dashboard)
      } catch {
        toast.error('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  const cardBase = `border rounded-2xl p-6 transition-all duration-200 ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-sm'}`
  const headingCls = `text-lg font-bold mb-5 ${darkMode ? 'text-white' : 'text-gray-900'}`
  const textCls = darkMode ? 'text-white' : 'text-gray-900'
  const gridStroke = darkMode ? '#374151' : '#f3f4f6'
  const axisStroke = darkMode ? '#6b7280' : '#9ca3af'

  if (loading) return <SkeletonDashboard />

  const overview = dashboard?.overview || {}
  const alerts = dashboard?.alerts || {}
  const recentAppointments = dashboard?.recentActivities?.appointments || []

  const revenueData = [
    { month: 'Nov', Revenue: 38000 },
    { month: 'Dec', Revenue: 52000 },
    { month: 'Jan', Revenue: 44000 },
    { month: 'Feb', Revenue: 61000 },
    { month: 'Mar', Revenue: 57000 },
    { month: 'Apr', Revenue: (dashboard?.revenue?.today || 0) > 0 ? dashboard.revenue.today * 30 : 67000 },
  ]

  const aptTrendData = [
    { day: 'Mon', Appointments: 14 },
    { day: 'Tue', Appointments: 18 },
    { day: 'Wed', Appointments: 12 },
    { day: 'Thu', Appointments: 21 },
    { day: 'Fri', Appointments: 16 },
    { day: 'Sat', Appointments: 9 },
  ]

  const bedData = [
    { name: 'Occupied', value: overview.occupiedBeds || 0, color: '#ef4444' },
    { name: 'Available', value: overview.availableBeds || 0, color: '#10b981' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${textCls}`}>Dashboard Overview</h1>
          <p className="text-gray-400 text-sm mt-1">Welcome back — here's what's happening today.</p>
        </div>
        <div className={`hidden sm:flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full ${darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          System Live
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Patients" value={(overview.totalPatients || 0).toLocaleString()} icon={Users} color="from-blue-600 to-cyan-500" />
        <StatCard title="Appointments Today" value={overview.todayAppointments || 0} icon={Calendar} color="from-violet-600 to-purple-500" />
        <StatCard title="Available Beds" value={overview.availableBeds || 0} icon={Bed} color="from-emerald-600 to-teal-500" />
        <StatCard title="Revenue Today" value={`₹${(dashboard?.revenue?.today || 0).toLocaleString()}`} icon={IndianRupee} color="from-orange-500 to-amber-500" />
      </div>

      {/* Alerts */}
      {(alerts.lowStockMedicines > 0 || alerts.pendingBills > 0) && (
        <div className="flex flex-wrap gap-3">
          {alerts.lowStockMedicines > 0 && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${darkMode ? 'bg-red-900/20 border-red-800/60 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
              <AlertCircle size={15} />
              {alerts.lowStockMedicines} low-stock medicine{alerts.lowStockMedicines > 1 ? 's' : ''}
            </div>
          )}
          {alerts.pendingBills > 0 && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${darkMode ? 'bg-amber-900/20 border-amber-800/60 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
              <Activity size={15} />
              {alerts.pendingBills} pending bill{alerts.pendingBills > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Main content: Appointments + Bed Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className={`lg:col-span-2 ${cardBase}`}>
          <h2 className={headingCls}>Recent Appointments</h2>
          <div className="space-y-3">
            {recentAppointments.length === 0 ? (
              <div className="text-center py-10">
                <Stethoscope className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No appointments today</p>
              </div>
            ) : (
              recentAppointments.slice(0, 5).map((apt) => {
                const patientName = apt.patient?.userId?.name || apt.patient?.patientId || 'Unknown'
                const doctorName = (apt.doctor?.userId?.name || 'Unknown').replace(/^Dr\.?\s*/i, '').trim()
                const initials = patientName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                const timeStr = apt.timeSlot?.startTime || '—'
                return (
                  <div key={apt._id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${darkMode ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {initials}
                      </div>
                      <div>
                        <p className={`font-semibold text-sm ${textCls}`}>{patientName}</p>
                        <p className="text-xs text-gray-400">Dr. {doctorName} · {timeStr}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[apt.status] || STATUS_COLORS.Scheduled}`}>
                      {apt.status}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Bed Status */}
        <div className={cardBase}>
          <h2 className={headingCls}>Bed Status</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={bedData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} dataKey="value" strokeWidth={0}>
                {bedData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2.5">
            {[
              { label: 'Total Beds', value: overview.totalBeds || 0, color: textCls },
              { label: 'Occupied', value: overview.occupiedBeds || 0, color: 'text-red-500' },
              { label: 'Available', value: overview.availableBeds || 0, color: 'text-emerald-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center text-sm">
                <span className="text-gray-500">{label}</span>
                <span className={`font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue trend */}
        <div className={cardBase}>
          <div className="flex items-center justify-between mb-5">
            <h2 className={`text-lg font-bold ${textCls}`}>Revenue Trend</h2>
            <div className={`flex items-center gap-1 text-xs font-medium ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              <TrendingUp className="w-4 h-4" /> +18% this month
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="month" stroke={axisStroke} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke={axisStroke} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
              <Line type="monotone" dataKey="Revenue" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly appointments */}
        <div className={cardBase}>
          <h2 className={`text-lg font-bold mb-5 ${textCls}`}>Weekly Appointments</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={aptTrendData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="day" stroke={axisStroke} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke={axisStroke} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
              <Bar dataKey="Appointments" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
