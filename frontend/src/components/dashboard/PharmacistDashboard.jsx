import React, { useEffect, useState } from 'react'
import { Pill, AlertCircle, Clock, CheckCircle2, ChevronRight, Zap, Package } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { SkeletonDashboard } from '../common/SkeletonCard'
import { getPharmacistDashboard } from '../../services/dashboardService'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'

const PharmacistDashboard = () => {
  const { darkMode } = useTheme()
  const { user }     = useAuth()
  const navigate     = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    getPharmacistDashboard()
      .then(res => setDashboard(res.dashboard))
      .catch(() => toast.error('Failed to load pharmacist dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const card    = `border rounded-xl transition-all duration-200 ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)]'}`
  const textCls = darkMode ? 'text-white' : 'text-[#2C3E50]'
  const subCls  = 'text-[#7B8A8B]'

  if (loading) return <SkeletonDashboard />

  const overview              = dashboard?.overview              || {}
  const pendingPrescriptions  = dashboard?.pendingPrescriptions  || []
  const lowStockAlerts        = dashboard?.lowStockAlerts        || []
  const expiringAlerts        = dashboard?.expiringAlerts        || []

  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = (user?.name || 'Pharmacist').split(' ')[0]
  const dateStr   = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const hasAlerts = lowStockAlerts.length > 0 || expiringAlerts.length > 0

  const kpiItems = [
    { label: 'Pending Prescriptions', value: overview.pendingPrescriptions ?? 0, icon: Pill,        bg: darkMode ? 'bg-blue-900/30'    : 'bg-blue-50',    ic: '#2E86DE' },
    { label: 'Low Stock Items',       value: overview.lowStockMedicines    ?? 0, icon: AlertCircle, bg: darkMode ? 'bg-red-900/30'     : 'bg-red-50',     ic: '#ef4444' },
    { label: 'Expiring (30 days)',    value: overview.expiringMedicines    ?? 0, icon: Clock,       bg: darkMode ? 'bg-orange-900/30'  : 'bg-orange-50',  ic: '#f97316' },
    { label: 'Dispensed Today',       value: overview.todayDispensed       ?? 0, icon: CheckCircle2,bg: darkMode ? 'bg-emerald-900/30' : 'bg-emerald-50', ic: '#10b981' },
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
        {hasAlerts ? (
          <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border flex-shrink-0
            bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
            {lowStockAlerts.length + expiringAlerts.length} inventory alert{lowStockAlerts.length + expiringAlerts.length !== 1 ? 's' : ''}
          </div>
        ) : (
          <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border flex-shrink-0
            ${darkMode ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            Inventory healthy
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
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">

        {/* Pending Prescriptions */}
        <div className={`${card} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-base font-bold ${textCls}`}>Prescriptions Queue</h2>
              <p className={`text-xs mt-0.5 ${subCls}`}>Pending dispensing requests</p>
            </div>
            {pendingPrescriptions.length > 0 && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0
                ${darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
                {pendingPrescriptions.length} pending
              </span>
            )}
          </div>

          {pendingPrescriptions.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className={`font-semibold ${textCls}`}>Queue is clear</p>
              <p className={`text-sm mt-1 ${subCls}`}>No pending prescriptions</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingPrescriptions.map((rx) => {
                const patientName = rx.patient?.userId?.name || rx.patient?.patientId || 'Unknown'
                const doctorName  = (rx.doctor?.userId?.name || 'Unknown').replace(/^Dr\.?\s*/i, '').trim()
                const dateStr     = rx.createdAt
                  ? new Date(rx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                  : '—'
                return (
                  <div key={rx._id} className={`p-4 rounded-xl border transition-colors
                    ${darkMode ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div>
                        <p className={`font-semibold text-sm ${textCls}`}>{patientName}</p>
                        <p className={`text-xs ${subCls}`}>Dr. {doctorName} · {dateStr}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        Pending
                      </span>
                    </div>
                    <div className="space-y-1">
                      {(rx.medicines || []).slice(0, 3).map((m, i) => (
                        <div key={i} className={`flex items-center gap-2 text-xs ${subCls}`}>
                          <Pill className="w-3.5 h-3.5 text-[#2E86DE] flex-shrink-0" />
                          {m.medicine?.name || 'Medicine'}{m.dosage ? ` — ${m.dosage}` : ''}
                        </div>
                      ))}
                      {(rx.medicines || []).length > 3 && (
                        <p className={`text-xs ml-5 ${subCls}`}>+{rx.medicines.length - 3} more</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right panel — Inventory Alerts + Quick Actions */}
        <div className="space-y-4 lg:sticky lg:top-6">

          {/* Low Stock */}
          <div className={`${card} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <h3 className={`text-sm font-bold ${textCls}`}>Low Stock</h3>
              </div>
              {lowStockAlerts.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  {lowStockAlerts.length} item{lowStockAlerts.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {lowStockAlerts.length === 0 ? (
              <p className={`text-xs text-center py-4 ${subCls}`}>All stock levels normal</p>
            ) : (
              <div className="space-y-2">
                {lowStockAlerts.slice(0, 4).map((med) => {
                  const pct = med.reorderLevel > 0
                    ? Math.min(100, Math.round((med.stockQuantity / med.reorderLevel) * 100)) : 0
                  return (
                    <div key={med._id} className={`p-3 rounded-xl border ${darkMode ? 'border-red-900/40 bg-red-900/10' : 'border-red-100 bg-red-50/60'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className={`font-medium text-xs truncate flex-1 ${textCls}`}>{med.name}</p>
                        <p className="text-xs font-bold text-red-600 ml-2 flex-shrink-0">{med.stockQuantity} / {med.reorderLevel}</p>
                      </div>
                      <div className={`w-full rounded-full h-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div className="h-1 rounded-full bg-red-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Expiring Soon */}
          <div className={`${card} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <h3 className={`text-sm font-bold ${textCls}`}>Expiring Soon</h3>
              </div>
              {expiringAlerts.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  {expiringAlerts.length} item{expiringAlerts.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {expiringAlerts.length === 0 ? (
              <p className={`text-xs text-center py-4 ${subCls}`}>No medicines expiring soon</p>
            ) : (
              <div className="space-y-1.5">
                {expiringAlerts.slice(0, 4).map((med) => {
                  const daysLeft = med.expiryDate
                    ? Math.ceil((new Date(med.expiryDate) - Date.now()) / (1000 * 60 * 60 * 24)) : null
                  return (
                    <div key={med._id} className={`flex items-center justify-between p-2.5 rounded-xl border
                      ${darkMode ? 'border-orange-900/40 bg-orange-900/10' : 'border-orange-100 bg-orange-50/60'}`}>
                      <p className={`font-medium text-xs truncate flex-1 ${textCls}`}>{med.name}</p>
                      <div className="text-right ml-2 flex-shrink-0">
                        <p className="text-xs font-bold text-orange-600">
                          {med.expiryDate
                            ? new Date(med.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
                            : '—'}
                        </p>
                        {daysLeft !== null && (
                          <p className={`text-[10px] ${subCls}`}>{daysLeft}d left</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className={`${card} p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-3.5 h-3.5 text-[#2E86DE]" />
              <h3 className={`text-[10px] font-bold uppercase tracking-widest ${subCls}`}>Quick Actions</h3>
            </div>
            <div className="space-y-1">
              {[
                { label: 'Dispense Medicines', path: '/pharmacy', icon: Pill    },
                { label: 'Manage Inventory',   path: '/pharmacy', icon: Package },
              ].map(({ label, path, icon: Icon }) => (
                <button
                  key={label}
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

export default PharmacistDashboard
