import React, { useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Sparkles, Stethoscope, BedDouble, HeartPulse, FileText,
  Calendar, UserCheck, Bot
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import PageLayout from '../components/common/PageLayout'
import { getUserRoleKey } from '../config/rolePolicy'

// Import all AI Agent components
import {
  SymptomCheckerAgent,
  MediBotAgent,
  ReportAnalysisAgent,
  HealthRiskAgent,
  BedAllocationAgent,
  AppointmentOptimizerAgent,
  PatientSummaryAgent,
} from '../agents'

const AGENT_TABS = [
  {
    id: 'symptom-checker',
    name: 'Symptom Checker',
    description: 'Safety-screened symptom guidance and specialist matching',
    icon: Stethoscope,
    color: 'from-blue-500 to-cyan-500',
    badge: 'Popular',
    allowedRoles: ['admin', 'doctor', 'patient', 'nurse', 'receptionist'],
  },
  {
    id: 'bed-allocation',
    name: 'Bed Allocation',
    description: 'Current-record bed placement recommendation',
    icon: BedDouble,
    color: 'from-emerald-500 to-teal-500',
    badge: 'Hospital Ops',
    allowedRoles: ['admin', 'doctor', 'nurse', 'ward-manager'],
  },
  {
    id: 'health-risk',
    name: 'Health Risk Calculator',
    description: 'Transparent rules-based health risk screening',
    icon: HeartPulse,
    color: 'from-rose-500 to-pink-500',
    badge: 'Rules Engine',
    allowedRoles: ['admin', 'doctor', 'patient'],
  },
  {
    id: 'report-analyzer',
    name: 'Lab Report Analyzer',
    description: 'Plain-language explanation of medical lab reports',
    icon: FileText,
    color: 'from-amber-500 to-orange-500',
    badge: 'Diagnostics',
    allowedRoles: ['admin', 'doctor', 'patient', 'lab-technician', 'radiology-technician'],
  },
  {
    id: 'appointment-optimizer',
    name: 'Appointment Optimizer',
    description: 'Match symptoms with specialist workloads',
    icon: Calendar,
    color: 'from-purple-500 to-indigo-500',
    badge: 'Scheduling',
    allowedRoles: ['admin', 'doctor', 'patient', 'receptionist'],
  },
  {
    id: 'patient-summary',
    name: 'Patient Clinical Summary',
    description: 'Aggregated EHR summary for physician review',
    icon: UserCheck,
    color: 'from-sky-500 to-blue-600',
    badge: 'EHR Intelligence',
    allowedRoles: ['admin', 'doctor', 'patient', 'nurse'],
  },
  {
    id: 'medibot',
    name: 'MediBot Assistant',
    description: 'Conversational assistant for guidance & answers',
    icon: Bot,
    color: 'from-teal-500 to-emerald-600',
    badge: 'Guidance',
    allowedRoles: ['admin', 'doctor', 'patient', 'nurse', 'receptionist', 'pharmacist', 'lab-technician', 'radiology-technician', 'billing-staff', 'ward-manager'],
  },
]

const AIAgents = () => {
  const { darkMode } = useTheme()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const roleKey = getUserRoleKey(user)
  const showTechnicalSource = roleKey !== 'patient'
  const availableAgents = AGENT_TABS.filter((agent) => agent.allowedRoles.includes(roleKey))
  const activeTab = searchParams.get('tab')
  const activeDefinition = AGENT_TABS.find((agent) => agent.id === activeTab)

  useEffect(() => {
    if (!activeTab) return
    if (!activeDefinition) {
      setSearchParams({}, { replace: true })
      return
    }
    if (!activeDefinition.allowedRoles.includes(roleKey)) {
      navigate('/access-denied', { replace: true, state: { from: location } })
    }
  }, [activeTab, activeDefinition, location, navigate, roleKey, setSearchParams])

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId })
  }

  const closeAgent = () => setSearchParams({}, { replace: true })

  return (
    <PageLayout>
      <div className="w-full space-y-5">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-6 sm:p-8 text-white shadow-xl">
          <div className="relative z-10 max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-white">
              <Sparkles size={14} className="text-amber-300" /> MediLink Decision Support
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Clinical & Operational Decision-Support Tools
            </h1>
            <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
              Safety-screened guidance, record-grounded summaries, current bed/doctor lookups, and transparent rules-based risk scoring. All clinical outputs require professional review.
            </p>
          </div>
        </div>

        {/* Agent Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {availableAgents.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : darkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-blue-500'} />
                <span>{tab.name}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className={`mt-2 rounded-2xl border p-5 text-center ${
          darkMode ? 'border-gray-700 bg-gray-800/80' : 'border-gray-200 bg-white shadow-sm'
        }`}>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Choose a decision-support tool</h2>
          <p className="mx-auto mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Select a tool above. Only options available to your role are shown.
          </p>
        </div>

        <SymptomCheckerAgent
          open={activeTab === 'symptom-checker'}
          onClose={closeAgent}
          showTechnicalSource={showTechnicalSource}
        />
        <BedAllocationAgent
          open={activeTab === 'bed-allocation'}
          onClose={closeAgent}
          showTechnicalSource={showTechnicalSource}
        />
        <HealthRiskAgent
          open={activeTab === 'health-risk'}
          onClose={closeAgent}
          showTechnicalSource={showTechnicalSource}
        />
        <ReportAnalysisAgent
          open={activeTab === 'report-analyzer'}
          onClose={closeAgent}
          showTechnicalSource={showTechnicalSource}
        />
        <AppointmentOptimizerAgent
          open={activeTab === 'appointment-optimizer'}
          onClose={closeAgent}
          showTechnicalSource={showTechnicalSource}
        />
        <PatientSummaryAgent
          open={activeTab === 'patient-summary'}
          onClose={closeAgent}
          showTechnicalSource={showTechnicalSource}
        />
        <MediBotAgent
          open={activeTab === 'medibot'}
          onClose={closeAgent}
          onOpenSymptomChecker={() => handleTabChange('symptom-checker')}
          showTechnicalSource={showTechnicalSource}
        />
      </div>
    </PageLayout>
  )
}

export default AIAgents
