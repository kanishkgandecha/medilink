import React, { useEffect, useState } from 'react'
import {
  Calendar, Users, FileText, CheckCircle2, Sparkles,
  ChevronRight, Zap, Clock, Circle,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { SkeletonDashboard } from '../common/SkeletonCard'
import { getDoctorDashboard } from '../../services/dashboardService'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import PatientSummaryAgent from '../../agents/PatientSummaryAgent'

const STATUS_BADGE = {
  Confirmed:    'bg-emerald-100 text-emerald-700',
  Scheduled:    'bg-[#EBF5FB] text-[#2E86DE]',
  Pending:      'bg-amber-100 text-amber-700',
  Completed:    'bg-gray-100 text-gray-600',
  Cancelled:    'bg-red-100 text-red-600',
  'In-Progress':'bg-violet-100 text-violet-700',
}

const DoctorDashboard = () => {
  const { darkMode } = useTheme()
  const { user }     = useAuth()
  const navigate     = useNavigate()
  const [dashboard, setDashboard]         = useState(null)
  const [loading, setLoading]             = useState(true)
  const [summaryPatientId, setSummaryPatientId] = useState(null)

  useEffect(() => {
    getDoctorDashboard()
      .then(res => setDashboard(res.dashboard))
      .catch(() => toast.error('Failed to load doctor dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const card    = `border rounded-xl transition-all duration-200 ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)]'}`
  const textCls = darkMode ? 'text-white' : 'text-[#2C3E50]'
  const subCls  = 'text-[#7B8A8B]'

  if (loading) return <SkeletonDashboard />

  const stats               = dashboard?.overview            || {}
  const todayAppointments   = dashboard?.todaySchedule       || []
  const recentPrescriptions = dashboard?.recentPrescriptions || []

  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const lastName  = (user?.name || 'Doctor').split(' ').slice(-1)[0]
  const dateStr   = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  const kpiItems = [
    { label: "Today's Apts",  value: stats.todayAppointments   ?? 0, icon: Calendar,     bg: darkMode ? 'bg-blue-900/30'    : 'bg-blue-50',    ic: '#2E86DE' },
    { label: 'Total Patients',value: stats.totalPatients        ?? 0, icon: Users,        bg: darkMode ? 'bg-teal-900/30'    : 'bg-teal-50',    ic: '#0d9488' },
    { label: 'Pending Rx',    value: stats.pendingPrescriptions ?? 0, icon: FileText,     bg: darkMode ? 'bg-violet-900/30'  : 'bg-violet-50',  ic: '#7c3aed' },
    { label: 'Completed',     value: stats.completedToday       ?? 0, icon: CheckCircle2, bg: darkMode ? 'bg-emerald-900/30' : 'bg-emerald-50', ic: '#10b981' },
  ]

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className={`text-2xl font-bold ${textCls}`}>
            {greeting},{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2E86DE] to-[#1ABC9C]">
              Dr. {lastName}
            </span>
          </h1>
          <p className={`text-sm mt-0.5 ${subCls}`}>{dateStr}</p>
        </div>
        <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border flex-shrink-0
          ${todayAppointments.length > 0
            ? darkMode ? 'bg-blue-900/30 text-blue-400 border-blue-700/40' : 'bg-[#EBF5FB] text-[#2E86DE] border-blue-200'
            : darkMode ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
            ${todayAppointments.length > 0 ? 'bg-[#2E86DE] animate-pulse' : 'bg-emerald-500'}`} />
          {todayAppointments.length > 0
            ? `${todayAppointments.length} appointment${todayAppointments.length !== 1 ? 's' : ''} today`
            : 'Schedule clear'}
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
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5 items-start">

        {/* Schedule timeline */}
        <div className={`${card} p-5`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className={`text-base font-bold ${textCls}`}>Today's Schedule</h2>
              <p className={`text-xs mt-0.5 ${subCls}`}>Your patient appointments for today</p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0
              ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-[#EBF5FB] text-[#2E86DE]'}`}>
              {todayAppointments.filter(a => a.status !== 'Completed').length} remaining
            </span>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="text-center py-14">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className={`font-semibold ${textCls}`}>All clear!</p>
              <p className={`text-sm mt-1 ${subCls}`}>No appointments scheduled today</p>
            </div>
          ) : (
            <div className="relative">
              <div className={`absolute left-[19px] top-2 bottom-2 w-px ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
              <div className="space-y-1.5">
                {todayAppointments.map((apt, idx) => {
                  const patientName = apt.patient?.userId?.name || apt.patient?.patientId || 'Unknown'
                  const timeStr     = apt.timeSlot?.startTime || '—'
                  const isCompleted = apt.status === 'Completed'
                  return (
                    <div key={apt._id} className="flex items-start gap-4">
                      <div className={`relative z-10 mt-4 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                        ${isCompleted
                          ? darkMode ? 'bg-gray-700' : 'bg-gray-100'
                          : 'bg-gradient-to-br from-[#2E86DE] to-[#5DADE2] shadow-md shadow-blue-500/30'}`}>
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
                            <p className={`text-xs mt-0.5 ${subCls}`}>{apt.type}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <div className={`flex items-center gap-1 text-xs ${subCls}`}>
                              <Clock className="w-3 h-3" />{timeStr}
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[apt.status] || STATUS_BADGE.Scheduled}`}>
                              {apt.status}
                            </span>
                          </div>
                        </div>
                        {apt.symptoms && (
                          <p className={`mt-2 text-xs truncate ${subCls}`}>Symptoms: {apt.symptoms}</p>
                        )}
                        {apt.patient?._id && (
                          <button
                            onClick={() => setSummaryPatientId(apt.patient._id)}
                            className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                          >
                            <Sparkles className="w-3 h-3" /> AI Patient Summary
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4 lg:sticky lg:top-6">

          {/* Recent Prescriptions */}
          <div className={`${card} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-bold ${textCls}`}>Recent Prescriptions</h3>
              <button onClick={() => navigate('/prescriptions')}
                className="text-xs text-[#2E86DE] font-semibold hover:underline flex items-center gap-0.5">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5">
              {recentPrescriptions.length === 0 ? (
                <p className={`text-xs text-center py-6 ${subCls}`}>No recent prescriptions</p>
              ) : recentPrescriptions.slice(0, 5).map((rx) => {
                const name     = rx.patient?.userId?.name || rx.patient?.patientId || 'Unknown'
                const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                return (
                  <div key={rx._id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all
                    ${darkMode ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-xs truncate ${textCls}`}>{name}</p>
                      <p className={`text-[11px] truncate ${subCls}`}>{rx.diagnosis || 'No diagnosis'}</p>
                    </div>
                    <Circle className="w-2 h-2 text-emerald-400 fill-emerald-400 flex-shrink-0" />
                  </div>
                )
              })}
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
                { label: 'All Appointments', path: '/appointments', icon: Calendar },
                { label: 'Write Prescription', path: '/prescriptions', icon: FileText },
                { label: 'Patient Records',    path: '/patients',      icon: Users },
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

        </div>
      </div>

      <PatientSummaryAgent
        open={!!summaryPatientId}
        onClose={() => setSummaryPatientId(null)}
        patientId={summaryPatientId}
      />
    </div>
  )
}

export default DoctorDashboard
