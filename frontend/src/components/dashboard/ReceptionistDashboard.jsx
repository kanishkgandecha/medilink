import React, { useEffect, useState } from 'react'
import { Calendar, Users, IndianRupee, CheckCircle2, Stethoscope, ChevronRight, Zap, Clock } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { SkeletonDashboard } from '../common/SkeletonCard'
import { getReceptionistDashboard } from '../../services/dashboardService'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'

const STATUS_BADGE = {
  Confirmed: 'bg-emerald-100 text-emerald-700',
  Scheduled: 'bg-[#EBF5FB] text-[#2E86DE]',
  Pending:   'bg-amber-100 text-amber-700',
  Cancelled: 'bg-red-100 text-red-600',
  Completed: 'bg-gray-100 text-gray-500',
}

const ReceptionistDashboard = () => {
  const { darkMode } = useTheme()
  const { user }     = useAuth()
  const navigate     = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    getReceptionistDashboard()
      .then(res => setDashboard(res.dashboard))
      .catch(() => toast.error('Failed to load receptionist dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const card    = `border rounded-xl transition-all duration-200 ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)]'}`
  const textCls = darkMode ? 'text-white' : 'text-[#2C3E50]'
  const subCls  = 'text-[#7B8A8B]'

  if (loading) return <SkeletonDashboard />

  const overview     = dashboard?.overview     || {}
  const todaySchedule = dashboard?.todaySchedule || []

  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = (user?.name || 'Receptionist').split(' ')[0]
  const dateStr   = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  const confirmed = todaySchedule.filter(a => a.status === 'Confirmed' || a.status === 'Completed').length
  const pending   = todaySchedule.filter(a => a.status === 'Pending' || a.status === 'Scheduled').length

  const kpiItems = [
    { label: "Today's Apts",    value: overview.todayAppointments  ?? 0, icon: Calendar,     bg: darkMode ? 'bg-blue-900/30'    : 'bg-blue-50',    ic: '#2E86DE' },
    { label: 'Available Doctors',value: overview.availableDoctors  ?? 0, icon: CheckCircle2, bg: darkMode ? 'bg-emerald-900/30' : 'bg-emerald-50', ic: '#10b981' },
    { label: 'Pending Bills',   value: overview.pendingBills       ?? 0, icon: IndianRupee,  bg: darkMode ? 'bg-orange-900/30'  : 'bg-orange-50',  ic: '#f97316' },
    { label: 'New Registrations',value: overview.todayRegistrations ?? 0, icon: Users,       bg: darkMode ? 'bg-violet-900/30'  : 'bg-violet-50',  ic: '#7c3aed' },
  ]

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className={`text-2xl font-bold ${textCls}`}>
            {greeting},{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2E86DE] to-[#1ABC9C]">
              {firstName}
            </span>
          </h1>
          <p className={`text-sm mt-0.5 ${subCls}`}>{dateStr}</p>
        </div>
        <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border flex-shrink-0
          ${darkMode ? 'bg-blue-900/30 text-blue-400 border-blue-700/40' : 'bg-[#EBF5FB] text-[#2E86DE] border-blue-200'}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#2E86DE] animate-pulse flex-shrink-0" />
          {todaySchedule.length} total · {confirmed} confirmed · {pending} pending
        </div>
      </div>

      {/* Compact KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiItems.map(({ label, value, icon: Icon, bg, ic }) => (
          <div key={label} className={`flex items-center gap-3 p-3.5 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)]'}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
              <Icon className="w-[18px] h-[18px]" style={{ color: ic }} />
            </div>
            <div>
              <p className={`text-xl font-bold leading-none ${textCls}`}>{value}</p>
              <p className={`text-[11px] mt-0.5 ${subCls}`}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main 2-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5 items-start">

        {/* Today's Schedule */}
        <div className={`${card} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-base font-bold ${textCls}`}>Today's Schedule</h2>
              <p className={`text-xs mt-0.5 ${subCls}`}>All appointments for today</p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0
              ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-[#EBF5FB] text-[#2E86DE]'}`}>
              {todaySchedule.length} total
            </span>
          </div>

          {todaySchedule.length === 0 ? (
            <div className="text-center py-14">
              <Stethoscope className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className={`font-semibold ${textCls}`}>No appointments today</p>
              <p className={`text-sm mt-1 ${subCls}`}>The schedule is clear for today</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {todaySchedule.map((apt) => {
                const patientName = apt.patient?.userId?.name || apt.patient?.patientId || 'Unknown'
                const doctorName  = (apt.doctor?.userId?.name || 'Unknown').replace(/^Dr\.?\s*/i, '').trim()
                const timeStr     = apt.timeSlot?.startTime || '—'
                const initials    = patientName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                const isPending   = apt.status === 'Pending' || apt.status === 'Scheduled'
                return (
                  <div key={apt._id} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-colors
                    ${isPending
                      ? darkMode ? 'border-blue-700/40 bg-blue-900/10' : 'border-blue-100 bg-blue-50/40'
                      : darkMode ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-100 hover:bg-gray-50'}`}>

                    {/* Time */}
                    <div className={`w-14 text-center flex-shrink-0`}>
                      <p className={`text-xs font-bold ${darkMode ? 'text-blue-400' : 'text-[#2E86DE]'}`}>{timeStr}</p>
                    </div>

                    <div className={`w-px h-8 flex-shrink-0 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

                    {/* Patient info */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2E86DE] to-[#5DADE2] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${textCls}`}>{patientName}</p>
                      <p className={`text-xs truncate ${subCls}`}>Dr. {doctorName} · {apt.type}</p>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${STATUS_BADGE[apt.status] || STATUS_BADGE.Scheduled}`}>
                      {apt.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4 lg:sticky lg:top-6">

          {/* Today's summary */}
          <div className={`${card} p-4`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${subCls}`}>Today at a Glance</p>
            <div className="space-y-2.5">
              {[
                { label: 'Confirmed / Completed', value: confirmed, color: 'text-emerald-500' },
                { label: 'Pending / Scheduled',   value: pending,   color: 'text-amber-500'   },
                {
                  label: 'Cancelled',
                  value: todaySchedule.filter(a => a.status === 'Cancelled').length,
                  color: 'text-red-500',
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className={subCls}>{label}</span>
                  <span className={`font-bold ${color}`}>{value}</span>
                </div>
              ))}
              <div className={`border-t pt-2.5 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className={subCls}>Total today</span>
                  <span className={`font-bold ${textCls}`}>{todaySchedule.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={`${card} p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-3.5 h-3.5 text-[#2E86DE]" />
              <h3 className={`text-[10px] font-bold uppercase tracking-widest ${subCls}`}>Quick Actions</h3>
            </div>
            <div className="space-y-1">
              {[
                { label: 'Register Patient',  path: '/patients',     icon: Users      },
                { label: 'Book Appointment',  path: '/appointments', icon: Calendar   },
                { label: 'View Bills',        path: '/billing',      icon: IndianRupee },
              ].map(({ label, path, icon: Icon }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left
                    ${darkMode ? 'text-gray-300 hover:bg-gray-700/60 hover:text-white' : 'text-[#2C3E50] hover:bg-[#EBF5FB] hover:text-[#2E86DE]'}`}>
                  <Icon className="w-4 h-4 text-[#2E86DE] flex-shrink-0" />
                  {label}
                  <ChevronRight className={`w-3.5 h-3.5 ml-auto ${subCls}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Next up */}
          {todaySchedule.filter(a => a.status === 'Scheduled' || a.status === 'Pending').length > 0 && (
            <div className={`${card} p-4`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${subCls}`}>Next Up</p>
              <div className="space-y-1.5">
                {todaySchedule
                  .filter(a => a.status === 'Scheduled' || a.status === 'Pending')
                  .slice(0, 3)
                  .map((apt) => {
                    const name    = apt.patient?.userId?.name || 'Unknown'
                    const timeStr = apt.timeSlot?.startTime || '—'
                    return (
                      <div key={apt._id} className="flex items-center gap-2.5">
                        <Clock className="w-3.5 h-3.5 text-[#2E86DE] flex-shrink-0" />
                        <span className={`text-xs font-medium ${textCls} flex-1 truncate`}>{name}</span>
                        <span className={`text-xs flex-shrink-0 ${subCls}`}>{timeStr}</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default ReceptionistDashboard
