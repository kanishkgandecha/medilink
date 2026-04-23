import React, { useEffect, useState } from 'react'
import { Calendar, FileText, Pill, Clock, User, IndianRupee, Droplets, ShieldAlert, Activity, Brain, MessageCircle, FlaskConical, X, Send, Loader2, Sparkles } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import StatCard from '../common/StatCard'
import { SkeletonDashboard } from '../common/SkeletonCard'
import { getPatientDashboard } from '../../services/dashboardService'
import { toast } from 'react-toastify'

// ─── AI Feature Modals ────────────────────────────────────────
const SYMPTOM_PROMPTS = [
  'Fever and chills', 'Chest pain', 'Headache', 'Shortness of breath',
  'Nausea or vomiting', 'Fatigue', 'Joint pain', 'Skin rash',
]

const AiModal = ({ open, onClose, title, icon: Icon, accentColor, children }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className={`px-5 py-4 flex items-center justify-between ${accentColor}`}>
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5 text-white" />
            <h2 className="font-bold text-white text-base">{title}</h2>
            <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">AI Preview</span>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

const SymptomChecker = ({ open, onClose }) => {
  const [input, setInput] = useState('')
  const [selected, setSelected] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const toggle = (s) => setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const analyze = () => {
    const symptoms = [...selected, ...(input ? [input] : [])]
    if (!symptoms.length) { toast.warn('Please enter or select at least one symptom'); return }
    setLoading(true)
    setTimeout(() => {
      setResult({
        urgency: symptoms.some(s => ['Chest pain', 'Shortness of breath'].includes(s)) ? 'High' : 'Moderate',
        suggestions: ['Schedule a consultation with a General Physician', 'Monitor symptoms for 24 hours', 'Stay hydrated and rest'],
        disclaimer: 'This is an AI-generated assessment for informational purposes only. Always consult a qualified medical professional.',
      })
      setLoading(false)
    }, 1800)
  }

  return (
    <AiModal open={open} onClose={onClose} title="AI Symptom Checker" icon={Brain} accentColor="bg-gradient-to-r from-violet-600 to-purple-600">
      {!result ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Select your symptoms or describe them below.</p>
          <div className="flex flex-wrap gap-2">
            {SYMPTOM_PROMPTS.map(s => (
              <button
                key={s}
                onClick={() => toggle(s)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${
                  selected.includes(s)
                    ? 'bg-violet-600 border-violet-600 text-white'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-violet-400'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Additional details</label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              rows={3}
              placeholder="Describe any other symptoms…"
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-violet-500 outline-none"
            />
          </div>
          <button
            onClick={analyze}
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:from-violet-700 hover:to-purple-700 disabled:opacity-60 transition"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing…</> : <><Sparkles className="w-4 h-4" /> Analyse Symptoms</>}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={`rounded-xl p-4 ${result.urgency === 'High' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900'}`}>
            <p className={`text-sm font-bold ${result.urgency === 'High' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
              Urgency: {result.urgency}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Recommendations</p>
            <ul className="space-y-2">
              {result.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">{result.disclaimer}</p>
          <button onClick={() => setResult(null)} className="w-full py-2 text-sm text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-900 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 transition">
            Check Again
          </button>
        </div>
      )}
    </AiModal>
  )
}

const Chatbot = ({ open, onClose }) => {
  const [msgs, setMsgs] = useState([
    { from: 'bot', text: 'Hi! I\'m MediBot, your AI health assistant. Ask me anything about your health, medications, or appointments.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const BOT_REPLIES = [
    'For any serious symptoms, please consult your assigned doctor immediately.',
    'I recommend staying hydrated and getting adequate rest.',
    'You can book an appointment from the Appointments section.',
    'Please check your Active Prescriptions for medication details.',
    'For emergency situations, please visit the nearest emergency room or call 112.',
    'Routine health check-ups are recommended every 6 months.',
  ]

  const send = () => {
    if (!input.trim()) return
    const userMsg = { from: 'user', text: input }
    setMsgs(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setTimeout(() => {
      setMsgs(prev => [...prev, { from: 'bot', text: BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)] }])
      setLoading(false)
    }, 1000)
  }

  return (
    <AiModal open={open} onClose={onClose} title="MediBot Assistant" icon={MessageCircle} accentColor="bg-gradient-to-r from-blue-600 to-cyan-600">
      <div className="flex flex-col gap-4 h-full min-h-[300px]">
        <div className="flex-1 space-y-3 overflow-y-auto max-h-64">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                m.from === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-tl-sm'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2.5 rounded-2xl rounded-tl-sm">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask a health question…"
            className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={send}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center">AI responses are informational only. Not a substitute for medical advice.</p>
      </div>
    </AiModal>
  )
}

const ReportAnalysis = ({ open, onClose }) => {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const analyze = () => {
    if (!file) { toast.warn('Please upload a report file'); return }
    setLoading(true)
    setTimeout(() => {
      setResult({
        summary: 'Blood report analysis complete. Most values are within normal range.',
        findings: ['Haemoglobin: 13.2 g/dL (Normal: 12–17)', 'Blood Sugar: 95 mg/dL (Normal: 70–100)', 'Cholesterol: 185 mg/dL (Normal: <200)'],
        recommendation: 'Overall health indicators are normal. Continue current lifestyle and diet.',
        disclaimer: 'AI analysis is for reference only. Please share with your doctor for clinical interpretation.',
      })
      setLoading(false)
    }, 2000)
  }

  return (
    <AiModal open={open} onClose={onClose} title="AI Report Analysis" icon={FlaskConical} accentColor="bg-gradient-to-r from-emerald-600 to-teal-600">
      {!result ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Upload a lab report (PDF or image) for AI-powered analysis.</p>
          <label className={`flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed cursor-pointer transition ${
            file ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-emerald-400 hover:bg-emerald-50/30'
          }`}>
            <FlaskConical className={`w-8 h-8 mb-2 ${file ? 'text-emerald-500' : 'text-gray-300'}`} />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {file ? file.name : 'Click to upload PDF or image'}
            </span>
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0])} />
          </label>
          <button
            onClick={analyze}
            disabled={loading || !file}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 transition"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing…</> : <><Sparkles className="w-4 h-4" /> Analyse Report</>}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900 p-4">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{result.summary}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Key Findings</p>
            <ul className="space-y-1.5">
              {result.findings.map((f, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>{f}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 p-3">
            <p className="text-sm text-blue-700 dark:text-blue-400">{result.recommendation}</p>
          </div>
          <p className="text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">{result.disclaimer}</p>
          <button onClick={() => { setResult(null); setFile(null) }} className="w-full py-2 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition">
            Analyse Another
          </button>
        </div>
      )}
    </AiModal>
  )
}

const CONDITION_COLOR = {
  Active: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Chronic: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

const PatientDashboard = () => {
  const { darkMode } = useTheme()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [aiModal, setAiModal] = useState(null) // 'symptom' | 'chat' | 'report'

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getPatientDashboard()
        // res = { success, role, patientInfo, dashboard, quickActions }
        setData(res)
      } catch {
        toast.error('Failed to load patient dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const card = `border rounded-2xl p-6 transition-all duration-200 ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-sm'}`
  const textCls = darkMode ? 'text-white' : 'text-gray-900'

  if (loading) return <SkeletonDashboard />

  const overview = data?.dashboard?.overview || {}
  const upcomingAppointments = data?.dashboard?.upcomingAppointments || []
  const prescriptions = data?.dashboard?.activePrescriptions || []
  const bills = data?.dashboard?.pendingBills || []
  const patientInfo = data?.patientInfo || {}

  const { bloodGroup, medicalHistory = [], allergies = [] } = patientInfo
  const hasHealthSummary = bloodGroup || medicalHistory.length > 0 || allergies.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${textCls}`}>My Health Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Your complete health overview at a glance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Upcoming Appointments" value={overview.upcomingAppointments ?? upcomingAppointments.length} icon={Calendar} color="from-blue-600 to-cyan-500" />
        <StatCard title="Active Prescriptions" value={overview.activePrescriptions ?? prescriptions.length} icon={Pill} color="from-violet-600 to-purple-500" />
        <StatCard title="Pending Bills" value={overview.unpaidBills ?? bills.length} icon={IndianRupee} color="from-orange-500 to-amber-500" />
        <StatCard title="Amount Due" value={overview.totalUnpaidAmount > 0 ? `₹${overview.totalUnpaidAmount.toLocaleString()}` : '₹0'} icon={FileText} color="from-emerald-600 to-teal-500" />
      </div>

      {/* Health Summary */}
      {hasHealthSummary && (
        <div className={`${card} border-l-4 border-l-blue-500`}>
          <h2 className={`text-lg font-bold mb-4 ${textCls}`}>Health Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {bloodGroup && (
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                  <Droplets className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Blood Group</p>
                  <p className="text-xl font-bold text-red-500">{bloodGroup}</p>
                </div>
              </div>
            )}

            {medicalHistory.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-amber-500" />
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Conditions</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {medicalHistory.slice(0, 3).map((h, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-medium ${CONDITION_COLOR[h.status] || CONDITION_COLOR.Active}`}>
                      {h.condition}
                    </span>
                  ))}
                  {medicalHistory.length > 3 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      +{medicalHistory.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {allergies.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Allergies</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {allergies.slice(0, 3).map((a, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700'}`}>
                      {a}
                    </span>
                  ))}
                  {allergies.length > 3 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      +{allergies.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upcoming Appointments */}
        <div className={card}>
          <h2 className={`text-lg font-bold mb-4 ${textCls}`}>Upcoming Appointments</h2>
          <div className="space-y-3">
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No upcoming appointments</p>
              </div>
            ) : (
              upcomingAppointments.map((apt) => {
                const doctorName = (apt.doctor?.userId?.name || 'Unknown').replace(/^Dr\.?\s*/i, '').trim()
                const specialization = apt.doctor?.specialization || ''
                const dateStr = apt.appointmentDate
                  ? new Date(apt.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'
                const timeStr = apt.timeSlot?.startTime || '—'
                return (
                  <div key={apt._id} className={`p-4 rounded-xl border transition-colors ${darkMode ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className={`font-semibold text-sm ${textCls}`}>Dr. {doctorName}</p>
                          <p className="text-xs text-gray-400">{specialization}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        {apt.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{dateStr}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{timeStr}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Active Prescriptions */}
        <div className={card}>
          <h2 className={`text-lg font-bold mb-4 ${textCls}`}>Active Prescriptions</h2>
          <div className="space-y-3">
            {prescriptions.length === 0 ? (
              <div className="text-center py-8">
                <Pill className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No active prescriptions</p>
              </div>
            ) : (
              prescriptions.map((rx) => {
                const doctorName = (rx.doctor?.userId?.name || 'Unknown').replace(/^Dr\.?\s*/i, '').trim()
                const dateStr = rx.createdAt
                  ? new Date(rx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                  : '—'
                return (
                  <div key={rx._id} className={`p-4 rounded-xl border ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div>
                        <p className={`font-semibold text-sm ${textCls}`}>Dr. {doctorName}</p>
                        <p className="text-xs text-gray-400">{dateStr}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        {rx.status}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {(rx.medicines || []).slice(0, 3).map((m, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                          <Pill className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                          <span>{m.medicine?.name || m.medicine || 'Medicine'}{m.dosage ? ` — ${m.dosage}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Pending Bills */}
      {bills.length > 0 && (
        <div className={card}>
          <h2 className={`text-lg font-bold mb-4 ${textCls}`}>Pending Bills</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bills.map((bill) => (
              <div key={bill._id} className={`p-4 rounded-xl border transition-colors ${darkMode ? 'border-amber-900/40 bg-amber-900/10 hover:bg-amber-900/20' : 'border-amber-200 bg-amber-50 hover:bg-amber-100/60'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`font-semibold text-sm ${textCls}`}>{bill.billNumber}</p>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {bill.paymentStatus}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    {bill.billDate ? new Date(bill.billDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </p>
                  <p className={`text-base font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    ₹{(bill.balance || bill.totalAmount || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Health Tools */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className={`text-lg font-bold ${textCls}`}>AI Health Tools</h2>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${darkMode ? 'bg-violet-900/30 text-violet-400' : 'bg-violet-50 text-violet-600'}`}>Preview</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setAiModal('symptom')}
            className={`group p-4 rounded-xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${darkMode ? 'border-violet-900/40 bg-violet-900/10 hover:bg-violet-900/20' : 'border-violet-100 bg-violet-50/60 hover:bg-violet-50'}`}
          >
            <Brain className="w-7 h-7 text-violet-500 mb-3" />
            <p className={`font-semibold text-sm ${textCls}`}>Symptom Checker</p>
            <p className="text-xs text-gray-400 mt-1">Describe symptoms and get AI-powered guidance</p>
          </button>
          <button
            onClick={() => setAiModal('chat')}
            className={`group p-4 rounded-xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${darkMode ? 'border-blue-900/40 bg-blue-900/10 hover:bg-blue-900/20' : 'border-blue-100 bg-blue-50/60 hover:bg-blue-50'}`}
          >
            <MessageCircle className="w-7 h-7 text-blue-500 mb-3" />
            <p className={`font-semibold text-sm ${textCls}`}>MediBot Chat</p>
            <p className="text-xs text-gray-400 mt-1">Ask your AI health assistant anything</p>
          </button>
          <button
            onClick={() => setAiModal('report')}
            className={`group p-4 rounded-xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${darkMode ? 'border-emerald-900/40 bg-emerald-900/10 hover:bg-emerald-900/20' : 'border-emerald-100 bg-emerald-50/60 hover:bg-emerald-50'}`}
          >
            <FlaskConical className="w-7 h-7 text-emerald-500 mb-3" />
            <p className={`font-semibold text-sm ${textCls}`}>Report Analysis</p>
            <p className="text-xs text-gray-400 mt-1">Upload lab reports for AI interpretation</p>
          </button>
        </div>
      </div>

      {/* AI Modals */}
      <SymptomChecker open={aiModal === 'symptom'} onClose={() => setAiModal(null)} />
      <Chatbot open={aiModal === 'chat'} onClose={() => setAiModal(null)} />
      <ReportAnalysis open={aiModal === 'report'} onClose={() => setAiModal(null)} />
    </div>
  )
}

export default PatientDashboard
