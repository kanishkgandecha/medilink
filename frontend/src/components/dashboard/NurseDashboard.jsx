import React, { useEffect, useState } from 'react'
import { Bed, Users, ClipboardList, AlertCircle } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import StatCard from '../common/StatCard'
import { SkeletonDashboard } from '../common/SkeletonCard'
import { getNurseDashboard } from '../../services/dashboardService'
import { toast } from 'react-toastify'

const PRIORITY_BADGE = {
  Emergency: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Urgent: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Normal: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

const NurseDashboard = () => {
  const { darkMode } = useTheme()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getNurseDashboard()
        setDashboard(res.dashboard)
      } catch {
        toast.error('Failed to load nurse dashboard')
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
  const wardOccupancy = dashboard?.wardOccupancy || []
  const criticalPatients = dashboard?.criticalPatients || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${textCls}`}>Nurse Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Ward occupancy and emergency case monitor</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Today's Appointments" value={overview.todayAppointments ?? '—'} icon={ClipboardList} color="from-blue-600 to-cyan-500" />
        <StatCard title="Emergency Cases" value={overview.criticalPatients ?? '—'} icon={AlertCircle} color="from-red-500 to-rose-500" />
        <StatCard title="Occupied Beds" value={overview.occupiedBeds ?? '—'} icon={Bed} color="from-orange-500 to-amber-500" />
        <StatCard title="Available Beds" value={overview.availableBeds ?? '—'} icon={Users} color="from-emerald-600 to-teal-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Ward Occupancy */}
        <div className={`lg:col-span-2 ${card}`}>
          <h2 className={`text-lg font-bold mb-5 ${textCls}`}>Ward Occupancy</h2>
          <div className="space-y-4">
            {wardOccupancy.length === 0 ? (
              <div className="text-center py-10">
                <Bed className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No ward data available</p>
              </div>
            ) : (
              wardOccupancy.map((ward) => {
                const occupied = ward.totalBeds - ward.availableBeds
                const pct = ward.totalBeds > 0 ? Math.round((occupied / ward.totalBeds) * 100) : 0
                const isCritical = pct >= 90
                const isHigh = pct >= 70
                const barColor = isCritical ? 'bg-red-500' : isHigh ? 'bg-orange-500' : 'bg-emerald-500'
                const pctColor = isCritical ? 'text-red-500' : isHigh ? 'text-orange-500' : 'text-emerald-500'
                return (
                  <div key={ward._id} className={`p-4 rounded-xl border ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className={`font-semibold text-sm ${textCls}`}>{ward.wardName}</p>
                        <p className="text-xs text-gray-400">{ward.wardType} · Ward {ward.wardNumber}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${pctColor}`}>{occupied}/{ward.totalBeds}</span>
                        <p className="text-xs text-gray-400">beds used</p>
                      </div>
                    </div>
                    <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                      <span>{pct}% occupied</span>
                      <span>{ward.availableBeds} available</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Emergency Cases */}
        <div className={card}>
          <div className="flex items-center justify-between mb-5">
            <h2 className={`text-lg font-bold ${textCls}`}>Emergency Cases</h2>
            {criticalPatients.length > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            )}
          </div>
          <div className="space-y-3">
            {criticalPatients.length === 0 ? (
              <div className="text-center py-10">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
                  <AlertCircle className="w-6 h-6 text-emerald-500" />
                </div>
                <p className={`font-semibold text-sm ${textCls}`}>All clear</p>
                <p className="text-gray-400 text-xs mt-1">No emergency cases</p>
              </div>
            ) : (
              criticalPatients.map((apt) => {
                const name = apt.patient?.userId?.name || apt.patient?.patientId || 'Unknown'
                const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                const timeStr = apt.timeSlot?.startTime || '—'
                return (
                  <div key={apt._id} className={`p-3 rounded-xl border ${darkMode ? 'border-red-900/40 bg-red-900/10' : 'border-red-100 bg-red-50/60'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm truncate ${textCls}`}>{name}</p>
                        <p className="text-xs text-gray-400">{apt.type} · {timeStr}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${PRIORITY_BADGE[apt.priority] || PRIORITY_BADGE.Emergency}`}>
                        {apt.priority}
                      </span>
                    </div>
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

export default NurseDashboard
