import React, { useState } from 'react'
import { ClipboardList, X, Loader2, Sparkles, AlertTriangle, User, Calendar, Pill, FileText, RotateCcw } from 'lucide-react'
import { toast } from 'react-toastify'
import { getPatientSummary } from '../services/aiService'
import api from '../services/api'

const PatientSummaryAgent = ({ open, onClose, patientId: propPatientId }) => {
  const [patientId, setPatientId] = useState(propPatientId || '')
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [patients, setPatients] = useState([])
  const [loadingList, setLoadingList] = useState(false)

  // Fetch patient list for selector (admin/doctor view)
  const fetchPatients = async () => {
    if (patients.length) return
    setLoadingList(true)
    try {
      const res = await api.get('/patients', { params: { limit: 100 } })
      const list = res?.data || res || []
      setPatients(list)
    } catch { /* non-critical */ }
    finally { setLoadingList(false) }
  }

  const submit = async (id) => {
    const pid = id || patientId
    if (!pid) { toast.warn('Please select or enter a patient ID'); return }
    setLoading(true)
    try {
      const res = await getPatientSummary(pid)
      setResult(res?.data || res)
    } catch (err) {
      toast.error(err?.message || 'Failed to generate patient summary')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (open && propPatientId) submit(propPatientId)
    if (open && !propPatientId) fetchPatients()
  }, [open])

  const reset = () => { setResult(null); setPatientId(propPatientId || '') }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between bg-gradient-to-r from-purple-600 to-fuchsia-600 flex-shrink-0">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-white" />
            <h2 className="font-bold text-white text-base">Patient Summary Agent</h2>
            <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-medium uppercase">LLM Powered</span>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-purple-600 dark:text-purple-400 animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-800 dark:text-white">Generating Clinical Summary</p>
                <p className="text-sm text-gray-500 mt-1">Fetching appointments, prescriptions, and billing data…</p>
              </div>
            </div>
          )}

          {!loading && !result && (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Generate a structured AI clinical summary for any patient — including medical history, current medications, risk flags, and recommendations.
              </p>

              {!propPatientId && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 block mb-1.5">Select Patient</label>
                  {loadingList ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading patients…
                    </div>
                  ) : patients.length > 0 ? (
                    <select
                      value={patientId}
                      onChange={e => setPatientId(e.target.value)}
                      className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="">— Select a patient —</option>
                      {patients.map(p => (
                        <option key={p._id} value={p._id}>
                          {p.userId?.name || p.name || 'Patient'} ({p.patientId || p._id})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={patientId}
                      onChange={e => setPatientId(e.target.value)}
                      placeholder="Enter patient MongoDB ID"
                      className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  )}
                </div>
              )}

              <button
                onClick={() => submit()}
                disabled={loading || !patientId}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:from-purple-700 hover:to-fuchsia-700 disabled:opacity-50 transition shadow-lg shadow-purple-500/25"
              >
                <Sparkles className="w-4 h-4" /> Generate Summary
              </button>
            </>
          )}

          {!loading && result && (
            <>
              {/* Overview */}
              <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-900 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <p className="text-xs font-bold uppercase tracking-wide text-purple-600 dark:text-purple-400">Patient Overview</p>
                </div>
                <p className="text-sm text-purple-900 dark:text-purple-200">{result.overview}</p>
              </div>

              {/* Activity stats */}
              {result.recentActivity && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Calendar, label: 'Appointments', value: result.recentActivity.appointments },
                    { icon: FileText, label: 'Last Visit', value: result.recentActivity.lastVisit },
                    { icon: ClipboardList, label: 'Pending Bills', value: result.recentActivity.pendingBills },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 text-center">
                      <Icon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                      <p className="text-base font-bold text-gray-900 dark:text-white">{value}</p>
                      <p className="text-[10px] text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Sections */}
              {[
                { label: 'Chief Complaints', items: result.chiefComplaints, icon: FileText, color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Medical History', items: result.medicalHistory, icon: ClipboardList, color: 'text-amber-600 dark:text-amber-400' },
                { label: 'Current Medications', items: result.currentMedications, icon: Pill, color: 'text-emerald-600 dark:text-emerald-400' },
              ].map(({ label, items, icon: Icon, color }) => items?.length && items[0] !== 'No recent complaints recorded' && (
                <div key={label}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                  </div>
                  <ul className="space-y-1">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className={`flex-shrink-0 ${color}`}>•</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* Risk flags */}
              {result.riskFlags?.some(f => f !== 'No current risk flags') && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <p className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400">Risk Flags</p>
                  </div>
                  {result.riskFlags.map((f, i) => (
                    <p key={i} className="text-sm text-red-700 dark:text-red-300">• {f}</p>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations?.length > 0 && (
                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-2">AI Recommendations</p>
                  {result.recommendations.map((r, i) => (
                    <p key={i} className="text-sm text-blue-800 dark:text-blue-300">• {r}</p>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
                ⚕️ This summary is AI-generated for reference. Clinical decisions must be made by a qualified healthcare professional.
              </p>

              {!propPatientId && (
                <button onClick={reset} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 text-sm font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 transition">
                  <RotateCcw className="w-4 h-4" /> Summarise Another Patient
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default PatientSummaryAgent
