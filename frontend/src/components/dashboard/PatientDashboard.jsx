import React, { useEffect, useState } from 'react'
import {
  Calendar, FileText, Pill, Clock, User, IndianRupee,
  Droplets, ShieldAlert, Activity, Brain, MessageCircle,
  FlaskConical, BedDouble, CalendarCheck, ClipboardList, Sparkles, ChevronRight,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { SkeletonDashboard } from '../common/SkeletonCard'
import { getPatientDashboard } from '../../services/dashboardService'
import { toast } from 'react-toastify'
import SymptomCheckerAgent       from '../../agents/SymptomCheckerAgent'
import MediBotAgent              from '../../agents/MediBotAgent'
import ReportAnalysisAgent       from '../../agents/ReportAnalysisAgent'
import HealthRiskAgent           from '../../agents/HealthRiskAgent'
import BedAllocationAgent        from '../../agents/BedAllocationAgent'
import AppointmentOptimizerAgent from '../../agents/AppointmentOptimizerAgent'
import PatientSummaryAgent       from '../../agents/PatientSummaryAgent'

const CONDITION_COLOR = {
  Active:   'bg-red-100 text-red-700',
  Chronic:  'bg-amber-100 text-amber-700',
  Resolved: 'bg-emerald-100 text-emerald-700',
}

const ALL_AI_TOOLS = [
  { key: 'symptom', icon: Brain,          color: 'from-violet-500 to-purple-600',  label: 'Symptom Checker',       desc: 'AI triage for your symptoms'      },
  { key: 'chat',    icon: MessageCircle,  color: 'from-[#2E86DE] to-[#5DADE2]',   label: 'MediBot Chat',          desc: 'LLM-powered health assistant'     },
  { key: 'risk',    icon: Activity,       color: 'from-rose-500 to-red-600',       label: 'Health Risk Predictor', desc: 'Assess your health risk level'    },
  { key: 'report',  icon: FlaskConical,   color: 'from-emerald-500 to-teal-600',  label: 'Report Analysis',       desc: 'Paste lab values for AI insights' },
  { key: 'bed',     icon: BedDouble,      color: 'from-sky-500 to-cyan-600',      label: 'Bed Allocation',        desc: 'Find best ward for admission'     },
  { key: 'appt',    icon: CalendarCheck,  color: 'from-indigo-500 to-violet-600', label: 'Appointment Optimizer', desc: 'AI picks the best doctor for you' },
  { key: 'summary', icon: ClipboardList,  color: 'from-purple-500 to-fuchsia-600',label: 'My Health Summary',     desc: 'AI-generated clinical overview'   },
]

const PatientDashboard = () => {
  const { darkMode } = useTheme()
  const { user }     = useAuth()
  const [data, setData]                   = useState(null)
  const [loading, setLoading]             = useState(true)
  const [aiModal, setAiModal]             = useState(null)
  const [showAllAI, setShowAllAI]         = useState(false)
  const [prefilledAppt, setPrefilledAppt] = useState({ symptoms: '', department: '' })

  useEffect(() => {
    getPatientDashboard()
      .then(res => setData(res))
      .catch(() => toast.error('Failed to load patient dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const card    = `border rounded-xl transition-all duration-200 ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)]'}`
  const textCls = darkMode ? 'text-white' : 'text-[#2C3E50]'
  const subCls  = 'text-[#7B8A8B]'

  if (loading) return <SkeletonDashboard />

  const overview  = data?.dashboard?.overview              || {}
  const upcoming  = data?.dashboard?.upcomingAppointments  || []
  const rxs       = data?.dashboard?.activePrescriptions   || []
  const bills     = data?.dashboard?.pendingBills          || []
  const info      = data?.patientInfo                      || {}
  const { bloodGroup, medicalHistory = [], allergies = [] } = info

  const activeConditions = medicalHistory.filter(h => h.status === 'Active').length
  const healthScore      = Math.max(30, 100 - activeConditions * 10 - allergies.length * 4 - bills.length * 3)
  const scoreColor       = healthScore >= 80 ? 'emerald' : healthScore >= 60 ? 'amber' : 'red'
  const scoreLabel       = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Fair' : 'Needs Attention'
  const scoreCls         = {
    emerald: { text: 'text-emerald-500', badge: darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700' },
    amber:   { text: 'text-amber-500',   badge: darkMode ? 'bg-amber-900/30 text-amber-400'     : 'bg-amber-50 text-amber-700'     },
    red:     { text: 'text-red-500',     badge: darkMode ? 'bg-red-900/30 text-red-400'         : 'bg-red-50 text-red-700'         },
  }[scoreColor]

  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = (user?.name || 'there').split(' ')[0]

  const kpiItems = [
    { label: 'Upcoming Appointments', value: overview.upcomingAppointments ?? upcoming.length, icon: Calendar,    bg: darkMode ? 'bg-blue-900/30'    : 'bg-blue-50',    ic: '#2E86DE' },
    { label: 'Active Prescriptions',  value: overview.activePrescriptions  ?? rxs.length,      icon: Pill,        bg: darkMode ? 'bg-violet-900/30'  : 'bg-violet-50',  ic: '#7c3aed' },
    { label: 'Pending Bills',         value: overview.unpaidBills          ?? bills.length,     icon: IndianRupee, bg: darkMode ? 'bg-orange-900/30'  : 'bg-orange-50',  ic: '#f97316' },
    {
      label: 'Amount Due',
      value: overview.totalUnpaidAmount > 0 ? `₹${overview.totalUnpaidAmount.toLocaleString()}` : '₹0',
      icon: FileText,
      bg: darkMode ? 'bg-teal-900/30' : 'bg-teal-50',
      ic: '#0d9488',
    },
  ]

  const visibleAITools = showAllAI ? ALL_AI_TOOLS : ALL_AI_TOOLS.slice(0, 3)

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
          <p className={`text-sm mt-0.5 ${subCls}`}>Your health overview for today</p>
        </div>
        <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border flex-shrink-0 ${scoreCls.badge}
          ${scoreColor === 'emerald' ? 'border-emerald-200 dark:border-emerald-700/40' : scoreColor === 'amber' ? 'border-amber-200 dark:border-amber-700/40' : 'border-red-200 dark:border-red-700/40'}`}>
          <Activity className={`w-3.5 h-3.5 ${scoreCls.text}`} />
          Health Score: {healthScore} — {scoreLabel}
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
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_272px] gap-5 items-start">

        {/* Left column */}
        <div className="space-y-5 min-w-0">

          {/* Health Summary banner */}
          {(bloodGroup || medicalHistory.length > 0 || allergies.length > 0) && (
            <div className={`${card} p-4`}>
              <h2 className={`text-sm font-bold mb-3 ${textCls}`}>Health Summary</h2>
              <div className="flex flex-wrap gap-4">
                {bloodGroup && (
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                      <Droplets className="w-[18px] h-[18px] text-red-500" />
                    </div>
                    <div>
                      <p className={`text-[11px] ${subCls}`}>Blood Group</p>
                      <p className="text-base font-bold text-red-500">{bloodGroup}</p>
                    </div>
                  </div>
                )}
                {medicalHistory.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Activity className="w-3.5 h-3.5 text-amber-500" />
                      <p className={`text-[10px] font-semibold uppercase tracking-wide ${subCls}`}>Conditions</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {medicalHistory.slice(0, 3).map((h, i) => (
                        <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-medium ${CONDITION_COLOR[h.status] || CONDITION_COLOR.Active}`}>
                          {h.condition}
                        </span>
                      ))}
                      {medicalHistory.length > 3 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                          +{medicalHistory.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {allergies.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                      <p className={`text-[10px] font-semibold uppercase tracking-wide ${subCls}`}>Allergies</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {allergies.slice(0, 3).map((a, i) => (
                        <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700'}`}>
                          {a}
                        </span>
                      ))}
                      {allergies.length > 3 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                          +{allergies.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upcoming Appointments + Active Prescriptions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className={`${card} p-5`}>
              <h2 className={`text-base font-bold mb-4 ${textCls}`}>Upcoming Appointments</h2>
              <div className="space-y-2.5">
                {upcoming.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className={`text-sm ${subCls}`}>No upcoming appointments</p>
                  </div>
                ) : upcoming.map(apt => {
                  const doctor  = (apt.doctor?.userId?.name || 'Unknown').replace(/^Dr\.?\s*/i, '').trim()
                  const spec    = apt.doctor?.specialization || ''
                  const dateStr = apt.appointmentDate
                    ? new Date(apt.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'
                  const timeStr = apt.timeSlot?.startTime || '—'
                  return (
                    <div key={apt._id} className={`p-3.5 rounded-xl border transition-colors
                      ${darkMode ? 'border-gray-700 hover:bg-gray-700/40' : 'border-[#E2E8F0] hover:bg-[#F5F7FA]'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#2E86DE] flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className={`font-semibold text-sm ${textCls}`}>Dr. {doctor}</p>
                            <p className={`text-xs ${subCls}`}>{spec}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ml-2
                          ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-[#EBF5FB] text-[#2E86DE]'}`}>
                          {apt.type}
                        </span>
                      </div>
                      <div className={`flex items-center gap-4 text-xs ${subCls}`}>
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{dateStr}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{timeStr}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={`${card} p-5`}>
              <h2 className={`text-base font-bold mb-4 ${textCls}`}>Active Prescriptions</h2>
              <div className="space-y-2.5">
                {rxs.length === 0 ? (
                  <div className="text-center py-8">
                    <Pill className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className={`text-sm ${subCls}`}>No active prescriptions</p>
                  </div>
                ) : rxs.map(rx => {
                  const doctor  = (rx.doctor?.userId?.name || 'Unknown').replace(/^Dr\.?\s*/i, '').trim()
                  const dateStr = rx.createdAt
                    ? new Date(rx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                    : '—'
                  return (
                    <div key={rx._id} className={`p-3.5 rounded-xl border ${darkMode ? 'border-gray-700' : 'border-[#E2E8F0]'}`}>
                      <div className="flex items-center justify-between mb-2.5">
                        <div>
                          <p className={`font-semibold text-sm ${textCls}`}>Dr. {doctor}</p>
                          <p className={`text-xs ${subCls}`}>{dateStr}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                          {rx.status}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {(rx.medicines || []).slice(0, 3).map((m, i) => (
                          <div key={i} className={`flex items-center gap-2 text-xs ${subCls}`}>
                            <Pill className="w-3.5 h-3.5 text-[#2E86DE] flex-shrink-0" />
                            {m.medicine?.name || m.medicine || 'Medicine'}{m.dosage ? ` — ${m.dosage}` : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Pending Bills */}
          {bills.length > 0 && (
            <div className={`${card} p-5`}>
              <h2 className={`text-base font-bold mb-4 ${textCls}`}>Pending Bills</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {bills.map(bill => (
                  <div key={bill._id} className={`p-4 rounded-xl border transition-colors
                    ${darkMode ? 'border-amber-900/40 bg-amber-900/10 hover:bg-amber-900/20' : 'border-amber-200 bg-amber-50 hover:bg-amber-100/60'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className={`font-semibold text-sm ${textCls}`}>{bill.billNumber}</p>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        {bill.paymentStatus}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-xs ${subCls}`}>
                        {bill.billDate
                          ? new Date(bill.billDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </p>
                      <p className={`text-base font-bold ${darkMode ? 'text-blue-400' : 'text-[#2E86DE]'}`}>
                        ₹{(bill.balance || bill.totalAmount || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4 xl:sticky xl:top-6">

          {/* Health Score */}
          <div className={`${card} p-4`}>
            <div className="flex items-center gap-2 mb-4">
              <Activity className={`w-4 h-4 ${scoreCls.text}`} />
              <h3 className={`text-sm font-bold ${textCls}`}>Health Score</h3>
            </div>
            <div className="flex flex-col items-center py-1">
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: darkMode ? 'rgb(55 65 81 / 0.6)' : '#F5F7FA',
                  boxShadow: `0 0 0 5px ${healthScore >= 80 ? 'rgba(16,185,129,0.15)' : healthScore >= 60 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)'}`,
                }}>
                <div className="text-center">
                  <p className={`text-2xl font-black leading-none ${scoreCls.text}`}>{healthScore}</p>
                  <p className={`text-[10px] ${subCls}`}>/ 100</p>
                </div>
              </div>
              <span className={`mt-3 text-xs font-bold px-3 py-1 rounded-full ${scoreCls.badge}`}>{scoreLabel}</span>
            </div>
            <div className={`mt-4 pt-3.5 border-t space-y-2 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              {[
                { label: 'Active Conditions', value: activeConditions, icon: Activity,    bad: activeConditions > 2 },
                { label: 'Known Allergies',   value: allergies.length, icon: ShieldAlert, bad: allergies.length > 3  },
                { label: 'Pending Bills',     value: bills.length,     icon: IndianRupee, bad: bills.length > 0       },
              ].map(({ label, value, icon: Icon, bad }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${bad ? 'text-amber-500' : 'text-emerald-500'}`} />
                    <span className={subCls}>{label}</span>
                  </div>
                  <span className={`font-bold ${bad ? 'text-amber-500' : 'text-emerald-500'}`}>{value}</span>
                </div>
              ))}
              {bloodGroup && (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-3.5 h-3.5 text-red-500" />
                    <span className={subCls}>Blood Group</span>
                  </div>
                  <span className="font-bold text-red-500">{bloodGroup}</span>
                </div>
              )}
            </div>
          </div>

          {/* AI Health Tools — 3 featured + expand */}
          <div className={`${card} p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <h3 className={`text-sm font-bold ${textCls}`}>AI Health Tools</h3>
            </div>
            <div className="space-y-1">
              {visibleAITools.map(({ key, icon: Icon, color, label, desc }) => (
                <button
                  key={key}
                  onClick={() => setAiModal(key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group
                    ${darkMode ? 'hover:bg-gray-700/60 text-gray-200' : 'hover:bg-[#F5F7FA] text-[#2C3E50]'}`}>
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-snug">{label}</p>
                    <p className={`text-[11px] leading-snug truncate ${subCls}`}>{desc}</p>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${subCls} group-hover:translate-x-0.5 transition-transform`} />
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAllAI(v => !v)}
              className={`mt-2 w-full text-center text-xs font-semibold py-2 rounded-xl transition-colors
                ${darkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/40' : 'text-[#7B8A8B] hover:text-[#2E86DE] hover:bg-[#F5F7FA]'}`}>
              {showAllAI ? 'Show fewer' : `+${ALL_AI_TOOLS.length - 3} more tools`}
            </button>
          </div>

        </div>
      </div>

      {/* AI Agent Modals */}
      <SymptomCheckerAgent
        open={aiModal === 'symptom'}
        onClose={() => setAiModal(null)}
        onBookAppointment={({ symptoms, department }) => {
          setPrefilledAppt({ symptoms, department })
          setAiModal('appt')
        }}
      />
      <MediBotAgent             open={aiModal === 'chat'}    onClose={() => setAiModal(null)} onOpenSymptomChecker={() => setAiModal('symptom')} />
      <ReportAnalysisAgent      open={aiModal === 'report'}  onClose={() => setAiModal(null)} />
      <HealthRiskAgent          open={aiModal === 'risk'}    onClose={() => setAiModal(null)} />
      <BedAllocationAgent       open={aiModal === 'bed'}     onClose={() => setAiModal(null)} />
      <AppointmentOptimizerAgent
        open={aiModal === 'appt'}
        onClose={() => { setAiModal(null); setPrefilledAppt({ symptoms: '', department: '' }) }}
        initialSymptoms={prefilledAppt.symptoms}
        initialDepartment={prefilledAppt.department}
      />
      <PatientSummaryAgent      open={aiModal === 'summary'} onClose={() => setAiModal(null)} />
    </div>
  )
}

export default PatientDashboard
