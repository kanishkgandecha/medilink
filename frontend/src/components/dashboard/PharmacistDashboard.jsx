import React, { useEffect, useState } from 'react'
import { Pill, AlertCircle, Clock, CheckCircle2, Package } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import StatCard from '../common/StatCard'
import { SkeletonDashboard } from '../common/SkeletonCard'
import { getPharmacistDashboard } from '../../services/dashboardService'
import { toast } from 'react-toastify'

const PharmacistDashboard = () => {
  const { darkMode } = useTheme()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getPharmacistDashboard()
        setDashboard(res.dashboard)
      } catch {
        toast.error('Failed to load pharmacist dashboard')
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
  const pendingPrescriptions = dashboard?.pendingPrescriptions || []
  const lowStockAlerts = dashboard?.lowStockAlerts || []
  const expiringAlerts = dashboard?.expiringAlerts || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${textCls}`}>Pharmacist Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Prescriptions queue and inventory alerts</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Pending Prescriptions" value={overview.pendingPrescriptions ?? '—'} icon={Pill} color="from-blue-600 to-cyan-500" />
        <StatCard title="Low Stock Items" value={overview.lowStockMedicines ?? '—'} icon={AlertCircle} color="from-red-500 to-rose-500" />
        <StatCard title="Expiring (30 days)" value={overview.expiringMedicines ?? '—'} icon={Clock} color="from-orange-500 to-amber-500" />
        <StatCard title="Dispensed Today" value={overview.todayDispensed ?? '—'} icon={CheckCircle2} color="from-emerald-600 to-teal-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pending Prescriptions */}
        <div className={card}>
          <h2 className={`text-lg font-bold mb-5 ${textCls}`}>Pending Prescriptions</h2>
          <div className="space-y-3">
            {pendingPrescriptions.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className={`font-semibold text-sm ${textCls}`}>Queue is clear</p>
                <p className="text-gray-400 text-xs mt-1">No pending prescriptions</p>
              </div>
            ) : (
              pendingPrescriptions.map((rx) => {
                const patientName = rx.patient?.userId?.name || rx.patient?.patientId || 'Unknown'
                const doctorName = (rx.doctor?.userId?.name || 'Unknown').replace(/^Dr\.?\s*/i, '').trim()
                const dateStr = rx.createdAt
                  ? new Date(rx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                  : '—'
                return (
                  <div key={rx._id} className={`p-4 rounded-xl border transition-colors ${darkMode ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div>
                        <p className={`font-semibold text-sm ${textCls}`}>{patientName}</p>
                        <p className="text-xs text-gray-400">Dr. {doctorName} · {dateStr}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Pending
                      </span>
                    </div>
                    <div className="space-y-1">
                      {(rx.medicines || []).slice(0, 3).map((m, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                          <Pill className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                          <span>{m.medicine?.name || 'Medicine'}{m.dosage ? ` — ${m.dosage}` : ''}</span>
                        </div>
                      ))}
                      {(rx.medicines || []).length > 3 && (
                        <p className="text-xs text-gray-400 ml-5">+{rx.medicines.length - 3} more</p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Alerts column */}
        <div className="space-y-5">
          {/* Low Stock */}
          <div className={card}>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h2 className={`text-lg font-bold ${textCls}`}>Low Stock</h2>
              {lowStockAlerts.length > 0 && (
                <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {lowStockAlerts.length} item{lowStockAlerts.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {lowStockAlerts.length === 0 ? (
                <p className="text-gray-400 text-center py-4 text-sm">All stock levels normal</p>
              ) : (
                lowStockAlerts.map((med) => {
                  const pct = med.reorderLevel > 0 ? Math.min(100, Math.round((med.stockQuantity / med.reorderLevel) * 100)) : 0
                  return (
                    <div key={med._id} className={`p-3 rounded-xl border ${darkMode ? 'border-red-900/40 bg-red-900/10' : 'border-red-100 bg-red-50/60'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="min-w-0">
                          <p className={`font-medium text-sm truncate ${textCls}`}>{med.name}</p>
                          <p className="text-xs text-gray-400">{med.category}</p>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <p className="text-sm font-bold text-red-600">{med.stockQuantity}</p>
                          <p className="text-xs text-gray-400">/ {med.reorderLevel} min</p>
                        </div>
                      </div>
                      <div className={`w-full rounded-full h-1.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div className="h-1.5 rounded-full bg-red-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Expiring Soon */}
          <div className={card}>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-orange-500" />
              <h2 className={`text-lg font-bold ${textCls}`}>Expiring Soon</h2>
              {expiringAlerts.length > 0 && (
                <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  {expiringAlerts.length} item{expiringAlerts.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {expiringAlerts.length === 0 ? (
                <p className="text-gray-400 text-center py-4 text-sm">No medicines expiring soon</p>
              ) : (
                expiringAlerts.map((med) => {
                  const daysLeft = med.expiryDate
                    ? Math.ceil((new Date(med.expiryDate) - Date.now()) / (1000 * 60 * 60 * 24))
                    : null
                  return (
                    <div key={med._id} className={`flex items-center justify-between p-3 rounded-xl border ${darkMode ? 'border-orange-900/40 bg-orange-900/10' : 'border-orange-100 bg-orange-50/60'}`}>
                      <div className="min-w-0">
                        <p className={`font-medium text-sm truncate ${textCls}`}>{med.name}</p>
                        <p className="text-xs text-gray-400">{med.category}</p>
                      </div>
                      <div className="text-right ml-2 flex-shrink-0">
                        <p className="text-sm font-bold text-orange-600">
                          {med.expiryDate ? new Date(med.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                        </p>
                        {daysLeft !== null && (
                          <p className="text-xs text-gray-400">{daysLeft}d left</p>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PharmacistDashboard
