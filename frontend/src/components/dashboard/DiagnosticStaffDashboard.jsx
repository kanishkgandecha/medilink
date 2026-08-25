import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Clock, FileSearch, FlaskConical, RefreshCw, ScanLine } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { getUserRoleKey } from '../../config/rolePolicy'
import { getDiagnosticWorkspace } from '../../services/patientService'
import { SkeletonDashboard } from '../common/SkeletonCard'

const DiagnosticStaffDashboard = () => {
  const { user } = useAuth()
  const { darkMode } = useTheme()
  const navigate = useNavigate()
  const roleKey = getUserRoleKey(user)
  const radiology = roleKey === 'radiology-technician'
  const roleLabel = radiology ? 'Radiology Technician' : 'Lab Technician'
  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getDiagnosticWorkspace()
      setWorkspace(response.data || {})
    } catch (err) {
      setError(err.message || 'Unable to load the diagnostic workspace')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <SkeletonDashboard />

  const text = darkMode ? 'text-white' : 'text-gray-900'
  const card = darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white shadow-sm'
  const overview = workspace?.overview || {}
  const recent = workspace?.recentReports || []
  const Icon = radiology ? ScanLine : FlaskConical
  const kpis = [
    { label: 'Total reports', value: overview.totalReports || 0, icon: FileSearch, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
    { label: 'Awaiting work', value: overview.pending || 0, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
    { label: 'Processing', value: overview.processing || 0, icon: RefreshCw, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30' },
    { label: 'Completed', value: overview.completed || 0, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
  ]

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className={`max-w-md rounded-2xl border p-8 text-center ${card}`}>
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
          <h1 className={`mt-3 text-xl font-bold ${text}`}>{roleLabel} workspace unavailable</h1>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <button onClick={load} className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${text}`}>{roleLabel} Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Record-backed {radiology ? 'imaging' : 'laboratory'} report workspace</p>
        </div>
        <button onClick={() => navigate('/test-reports')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          <Icon size={17} /> Open report workspace
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: KpiIcon, color }) => (
          <div key={label} className={`rounded-xl border p-4 ${card}`}>
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${color}`}><KpiIcon size={18} /></div>
            <p className={`text-2xl font-bold ${text}`}>{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className={`rounded-xl border p-5 ${card}`}>
        <div className="mb-4">
          <h2 className={`font-bold ${text}`}>Recent {radiology ? 'imaging' : 'laboratory'} reports</h2>
          <p className="text-xs text-gray-500">Latest reports visible to this diagnostic role</p>
        </div>
        {recent.length === 0 ? (
          <div className="py-10 text-center">
            <Icon className="mx-auto h-10 w-10 text-gray-300" />
            <p className={`mt-3 font-semibold ${text}`}>No reports in this queue</p>
            <p className="mt-1 text-sm text-gray-500">New reports will appear here after they are recorded.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recent.slice(0, 6).map((report) => (
              <div key={report._id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className={`truncate text-sm font-semibold ${text}`}>{report.testName}</p>
                  <p className="truncate text-xs text-gray-500">{report.patient?.name} · {report.patient?.patientId}</p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">{report.status}</span>
                  <p className="mt-1 text-[11px] text-gray-400">{report.addedAt ? new Date(report.addedAt).toLocaleDateString('en-IN') : '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DiagnosticStaffDashboard
