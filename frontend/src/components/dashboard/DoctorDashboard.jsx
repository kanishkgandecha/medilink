import React, { useEffect, useState } from 'react'
import { Calendar, Users, Clock, FileText, CheckCircle2, Circle } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import StatCard from '../common/StatCard'
import { SkeletonDashboard } from '../common/SkeletonCard'
import { getDoctorDashboard } from '../../services/dashboardService'
import { toast } from 'react-toastify'

const STATUS_DOT = {
  Confirmed: 'bg-emerald-500',
  Scheduled: 'bg-blue-500',
  Pending: 'bg-amber-500',
  Completed: 'bg-gray-400',
  Cancelled: 'bg-red-500',
  'In-Progress': 'bg-violet-500',
}

const STATUS_BADGE = {
  Confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Completed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  Cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

const DoctorDashboard = () => {
  const { darkMode } = useTheme()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getDoctorDashboard()
        setDashboard(res.dashboard)
      } catch {
        toast.error('Failed to load doctor dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const card = `border rounded-2xl p-6 transition-all duration-200 ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-sm'}`
  const textCls = darkMode ? 'text-white' : 'text-gray-900'

  if (loading) return <SkeletonDashboard />

  const stats = dashboard?.overview || {}
  const todayAppointments = dashboard?.todaySchedule || []
  const recentPrescriptions = dashboard?.recentPrescriptions || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${textCls}`}>Doctor Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Your schedule and patient overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Today's Appointments" value={stats.todayAppointments ?? '—'} icon={Calendar} color="from-blue-600 to-cyan-500" />
        <StatCard title="Total Patients" value={stats.totalPatients ?? '—'} icon={Users} color="from-violet-600 to-purple-500" />
        <StatCard title="Pending Prescriptions" value={stats.pendingPrescriptions ?? '—'} icon={FileText} color="from-emerald-600 to-teal-500" />
        <StatCard title="Completed Today" value={stats.completedToday ?? '—'} icon={Clock} color="from-orange-500 to-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Timeline — Today's Appointments */}
        <div className={`lg:col-span-2 ${card}`}>
          <div className="flex items-center justify-between mb-5">
            <h2 className={`text-lg font-bold ${textCls}`}>Today's Schedule</h2>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
              {todayAppointments.length} appointment{todayAppointments.length !== 1 ? 's' : ''}
            </span>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className={`font-semibold ${textCls}`}>All clear!</p>
              <p className="text-gray-400 text-sm mt-1">No appointments scheduled for today</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className={`absolute left-[19px] top-2 bottom-2 w-px ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

              <div className="space-y-1">
                {todayAppointments.map((apt, idx) => {
                  const patientName = apt.patient?.userId?.name || apt.patient?.patientId || 'Unknown'
                  const timeStr = apt.timeSlot?.startTime || '—'
                  const isCompleted = apt.status === 'Completed'
                  const dotColor = STATUS_DOT[apt.status] || 'bg-gray-400'

                  return (
                    <div key={apt._id} className="flex items-start gap-4">
                      {/* Timeline dot */}
                      <div className={`relative z-10 mt-4 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                        ${isCompleted
                          ? darkMode ? 'bg-gray-700' : 'bg-gray-100'
                          : 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-md shadow-blue-500/30'}`}>
                        {isCompleted
                          ? <CheckCircle2 className="w-4 h-4 text-gray-400" />
                          : <span className="text-white text-xs font-bold">{idx + 1}</span>}
                      </div>

                      <div className={`flex-1 p-4 rounded-xl border transition-all
                        ${isCompleted
                          ? darkMode ? 'border-gray-700/50 opacity-60' : 'border-gray-100 opacity-70'
                          : darkMode ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm truncate ${textCls} ${isCompleted ? 'line-through' : ''}`}>
                              {patientName}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{apt.type}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              {timeStr}
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[apt.status] || STATUS_BADGE.Scheduled}`}>
                              {apt.status}
                            </span>
                          </div>
                        </div>
                        {apt.symptoms && (
                          <p className="mt-2 text-xs text-gray-500 truncate">Symptoms: {apt.symptoms}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Recent Prescriptions */}
        <div className={card}>
          <h2 className={`text-lg font-bold mb-5 ${textCls}`}>Recent Prescriptions</h2>
          <div className="space-y-3">
            {recentPrescriptions.length === 0 ? (
              <p className="text-gray-400 text-center py-8 text-sm">No recent prescriptions</p>
            ) : (
              recentPrescriptions.map((rx) => {
                const name = rx.patient?.userId?.name || rx.patient?.patientId || 'Unknown'
                const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                const diagnosis = rx.diagnosis || null
                return (
                  <div key={rx._id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${darkMode ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${textCls}`}>{name}</p>
                      {diagnosis
                        ? <p className="text-xs text-gray-400 truncate">{diagnosis}</p>
                        : <p className="text-xs text-gray-400">No diagnosis recorded</p>}
                    </div>
                    <Circle className="w-2 h-2 text-emerald-400 fill-emerald-400 flex-shrink-0" />
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DoctorDashboard
