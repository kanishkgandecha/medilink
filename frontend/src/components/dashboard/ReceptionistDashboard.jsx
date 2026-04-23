import React, { useEffect, useState } from 'react'
import { Calendar, Users, IndianRupee, Clock, CheckCircle2, Stethoscope } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import StatCard from '../common/StatCard'
import { SkeletonDashboard } from '../common/SkeletonCard'
import { getReceptionistDashboard } from '../../services/dashboardService'
import { toast } from 'react-toastify'

const STATUS_BADGE = {
  Confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  Completed: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300',
}

const ReceptionistDashboard = () => {
  const { darkMode } = useTheme()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getReceptionistDashboard()
        setDashboard(res.dashboard)
      } catch {
        toast.error('Failed to load receptionist dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const card = `border rounded-2xl p-6 transition-all duration-200 ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-sm'}`
  const textCls = darkMode ? 'text-white' : 'text-gray-900'

  if (loading) return <SkeletonDashboard />

  const overview = dashboard?.overview || {}
  const todaySchedule = dashboard?.todaySchedule || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${textCls}`}>Receptionist Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Today's appointments and front-desk overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Today's Appointments" value={overview.todayAppointments ?? '—'} icon={Calendar} color="from-blue-600 to-cyan-500" />
        <StatCard title="Available Doctors" value={overview.availableDoctors ?? '—'} icon={CheckCircle2} color="from-emerald-600 to-teal-500" />
        <StatCard title="Pending Bills" value={overview.pendingBills ?? '—'} icon={IndianRupee} color="from-orange-500 to-amber-500" />
        <StatCard title="New Registrations" value={overview.todayRegistrations ?? '—'} icon={Users} color="from-violet-600 to-purple-500" />
      </div>

      <div className={card}>
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-lg font-bold ${textCls}`}>Today's Schedule</h2>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
            {todaySchedule.length} total
          </span>
        </div>

        {todaySchedule.length === 0 ? (
          <div className="text-center py-12">
            <Stethoscope className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className={`font-semibold ${textCls}`}>No appointments today</p>
            <p className="text-gray-400 text-sm mt-1">The schedule is clear for today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todaySchedule.map((apt) => {
              const patientName = apt.patient?.userId?.name || apt.patient?.patientId || 'Unknown'
              const doctorName = (apt.doctor?.userId?.name || 'Unknown').replace(/^Dr\.?\s*/i, '').trim()
              const timeStr = apt.timeSlot?.startTime || '—'
              const initials = patientName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              return (
                <div key={apt._id} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${darkMode ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-100 hover:bg-gray-50'}`}>
                  {/* Time column */}
                  <div className={`w-16 text-center flex-shrink-0 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    <p className="text-sm font-bold">{timeStr}</p>
                  </div>

                  <div className={`w-px h-10 flex-shrink-0 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

                  {/* Patient info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 bg-gradient-to-br from-blue-500 to-cyan-500`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-semibold text-sm truncate ${textCls}`}>{patientName}</p>
                      <p className="text-xs text-gray-400 truncate">Dr. {doctorName} · {apt.type}</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${STATUS_BADGE[apt.status] || STATUS_BADGE.Scheduled}`}>
                    {apt.status}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ReceptionistDashboard
