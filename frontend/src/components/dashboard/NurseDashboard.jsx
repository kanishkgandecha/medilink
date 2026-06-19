import React, { useEffect, useState } from 'react'
import { Bed, Users, ClipboardList, AlertCircle, ChevronRight, Zap } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { SkeletonDashboard } from '../common/SkeletonCard'
import { getNurseDashboard } from '../../services/dashboardService'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'

const PRIORITY_BADGE = {
  Emergency: 'bg-red-100 text-red-700',
  Urgent:    'bg-orange-100 text-orange-700',
  Normal:    'bg-amber-100 text-amber-700',
}

const NurseDashboard = () => {
  const { darkMode } = useTheme()
  const { user }     = useAuth()
  const navigate     = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    getNurseDashboard()
      .then(res => setDashboard(res.dashboard))
      .catch(() => toast.error('Failed to load nurse dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const card    = `border rounded-xl transition-all duration-200 ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)]'}`
  const textCls = darkMode ? 'text-white' : 'text-[#2C3E50]'
  const subCls  = 'text-[#7B8A8B]'

  if (loading) return <SkeletonDashboard />

  const overview         = dashboard?.overview         || {}
  const wardOccupancy    = dashboard?.wardOccupancy    || []
  const criticalPatients = dashboard?.criticalPatients || []

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = (user?.name || 'Nurse').split(' ')[0]
  const dateStr   = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  const hasEmergency = criticalPatients.length > 0

  const kpiItems = [
    { label: "Today's Apts",   value: overview.todayAppointments ?? 0, icon: ClipboardList, bg: darkMode ? 'bg-blue-900/30'    : 'bg-blue-50',    ic: '#2E86DE' },
    { label: 'Emergency Cases',value: overview.criticalPatients  ?? 0, icon: AlertCircle,   bg: darkMode ? 'bg-red-900/30'     : 'bg-red-50',     ic: '#ef4444' },
    { label: 'Occupied Beds',  value: overview.occupiedBeds      ?? 0, icon: Bed,           bg: darkMode ? 'bg-orange-900/30'  : 'bg-orange-50',  ic: '#f97316' },
    { label: 'Available Beds', value: overview.availableBeds     ?? 0, icon: Users,         bg: darkMode ? 'bg-emerald-900/30' : 'bg-emerald-50', ic: '#10b981' },
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
        {hasEmergency ? (
          <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border flex-shrink-0
            bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700/40">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            {criticalPatients.length} emergency case{criticalPatients.length !== 1 ? 's' : ''} active
          </div>
        ) : (
          <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border flex-shrink-0
            ${darkMode ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            No emergency cases
          </div>
        )}
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

        {/* Ward Occupancy */}
        <div className={`${card} p-5`}>
          <h2 className={`text-base font-bold mb-4 ${textCls}`}>Ward Occupancy</h2>
          <div className="space-y-3">
            {wardOccupancy.length === 0 ? (
              <div className="text-center py-10">
                <Bed className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className={`text-sm ${subCls}`}>No ward data available</p>
              </div>
            ) : wardOccupancy.map((ward) => {
              const occupied = ward.totalBeds - ward.availableBeds
              const pct      = ward.totalBeds > 0 ? Math.round((occupied / ward.totalBeds) * 100) : 0
              const isCritical = pct >= 90
              const isHigh     = pct >= 70
              const barColor   = isCritical ? 'bg-red-500' : isHigh ? 'bg-orange-500' : 'bg-emerald-500'
              const pctColor   = isCritical ? 'text-red-500' : isHigh ? 'text-orange-500' : 'text-emerald-500'
              return (
                <div key={ward._id} className={`p-4 rounded-xl border ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className={`font-semibold text-sm ${textCls}`}>{ward.wardName}</p>
                      <p className={`text-xs mt-0.5 ${subCls}`}>{ward.wardType} · Ward {ward.wardNumber}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${pctColor}`}>{occupied}/{ward.totalBeds}</span>
                      <p className={`text-xs ${subCls}`}>beds used</p>
                    </div>
                  </div>
                  <div className={`w-full rounded-full h-1.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className={`flex justify-between mt-1.5 text-[11px] ${subCls}`}>
                    <span>{pct}% occupied</span>
                    <span>{ward.availableBeds} available</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4 lg:sticky lg:top-6">

          {/* Emergency Cases */}
          <div className={`${card} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-bold ${textCls}`}>Emergency Cases</h3>
                {hasEmergency && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
              </div>
              {criticalPatients.length > 0 && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                  ${darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'}`}>
                  {criticalPatients.length}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {criticalPatients.length === 0 ? (
                <div className="text-center py-8">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${darkMode ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
                    <AlertCircle className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className={`font-semibold text-sm ${textCls}`}>All clear</p>
                  <p className={`text-xs mt-0.5 ${subCls}`}>No emergency cases</p>
                </div>
              ) : criticalPatients.map((apt) => {
                const name     = apt.patient?.userId?.name || apt.patient?.patientId || 'Unknown'
                const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                const timeStr  = apt.timeSlot?.startTime || '—'
                return (
                  <div key={apt._id} className={`p-3 rounded-xl border ${darkMode ? 'border-red-900/40 bg-red-900/10' : 'border-red-100 bg-red-50/60'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-xs truncate ${textCls}`}>{name}</p>
                        <p className={`text-[11px] ${subCls}`}>{apt.type} · {timeStr}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${PRIORITY_BADGE[apt.priority] || PRIORITY_BADGE.Emergency}`}>
                        {apt.priority}
                      </span>
                    </div>
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
                { label: 'Manage Wards',        path: '/wards',        icon: Bed          },
                { label: 'View Appointments',   path: '/appointments', icon: ClipboardList },
                { label: 'Patient Records',     path: '/patients',     icon: Users         },
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
    </div>
  )
}

export default NurseDashboard
