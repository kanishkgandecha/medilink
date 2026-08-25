import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Sparkles, Stethoscope, BedDouble, HeartPulse, FileText,
  Calendar, UserCheck, Bot, ArrowRight, Activity, Zap
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import PageLayout from '../components/common/PageLayout'

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
    type: 'page',
  },
  {
    id: 'bed-allocation',
    name: 'Bed Allocation',
    description: 'Real-time ward & bed assignment optimizer',
    icon: BedDouble,
    color: 'from-emerald-500 to-teal-500',
    badge: 'Hospital Ops',
    type: 'modal',
  },
  {
    id: 'health-risk',
    name: 'Health Risk Calculator',
    description: 'Transparent rules-based health risk screening',
    icon: HeartPulse,
    color: 'from-rose-500 to-pink-500',
    badge: 'Rules Engine',
    type: 'page',
  },
  {
    id: 'report-analyzer',
    name: 'Lab Report Analyzer',
    description: 'Plain-language explanation of medical lab reports',
    icon: FileText,
    color: 'from-amber-500 to-orange-500',
    badge: 'Diagnostics',
    type: 'modal',
  },
  {
    id: 'appointment-optimizer',
    name: 'Appointment Optimizer',
    description: 'Match symptoms with specialist workloads',
    icon: Calendar,
    color: 'from-purple-500 to-indigo-500',
    badge: 'Scheduling',
    type: 'modal',
  },
  {
    id: 'patient-summary',
    name: 'Patient Clinical Summary',
    description: 'Aggregated EHR summary for physician review',
    icon: UserCheck,
    color: 'from-sky-500 to-blue-600',
    badge: 'EHR Intelligence',
    type: 'modal',
  },
  {
    id: 'medibot',
    name: 'MediBot Assistant',
    description: 'Conversational assistant for guidance & answers',
    icon: Bot,
    color: 'from-teal-500 to-emerald-600',
    badge: '24/7 AI',
    type: 'page',
  },
]

const AIAgents = () => {
  const { darkMode } = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTabParam = searchParams.get('tab') || 'symptom-checker'
  const [activeTab, setActiveTab] = useState(activeTabParam)

  const [activeModal, setActiveModal] = useState(null)

  useEffect(() => {
    if (activeTabParam !== activeTab) {
      setActiveTab(activeTabParam)
    }
  }, [activeTabParam])

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setSearchParams({ tab: tabId })
    const targetDef = AGENT_TABS.find(t => t.id === tabId)
    if (targetDef?.type === 'modal') {
      setActiveModal(tabId)
    } else {
      setActiveModal(null)
    }
  }

  const renderActiveAgentPage = () => {
    switch (activeTab) {
      case 'symptom-checker':
        return <SymptomCheckerAgent />
      case 'health-risk':
        return <HealthRiskAgent />
      case 'medibot':
        return <MediBotAgent />
      default:
        // For modal agent types selected as tabs, show an interactive starter card
        const currentDef = AGENT_TABS.find(t => t.id === activeTab) || AGENT_TABS[0]
        const Icon = currentDef.icon
        return (
          <div className={`p-8 rounded-2xl border text-center max-w-2xl mx-auto my-8 ${
            darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${currentDef.color} flex items-center justify-center text-white mx-auto mb-4 shadow-lg`}>
              <Icon size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">{currentDef.name}</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{currentDef.description}</p>
            <button
              onClick={() => setActiveModal(currentDef.id)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition-transform active:scale-95"
            >
              <Zap size={18} /> Launch {currentDef.name}
            </button>
          </div>
        )
    }
  }

  return (
    <PageLayout title="AI Intelligence Suite">
      <div className="space-y-6">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-6 sm:p-8 text-white shadow-xl">
          <div className="relative z-10 max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-white">
              <Sparkles size={14} className="text-amber-300" /> MediLink Clinical AI Platform
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hospital Intelligence & Clinical AI Agents
            </h1>
            <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
              Safety-screened guidance, record-grounded summaries, current bed/doctor lookups, and transparent rules-based risk scoring. All clinical outputs require professional review.
            </p>
          </div>
        </div>

        {/* Agent Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {AGENT_TABS.map((tab) => {
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

        {/* Active Agent Main View */}
        <div className="mt-4">
          {renderActiveAgentPage()}
        </div>

        {/* Modals for Modal-based AI Agents */}
        <BedAllocationAgent
          open={activeModal === 'bed-allocation'}
          onClose={() => setActiveModal(null)}
        />
        <ReportAnalysisAgent
          open={activeModal === 'report-analyzer'}
          onClose={() => setActiveModal(null)}
        />
        <AppointmentOptimizerAgent
          open={activeModal === 'appointment-optimizer'}
          onClose={() => setActiveModal(null)}
        />
        <PatientSummaryAgent
          open={activeModal === 'patient-summary'}
          onClose={() => setActiveModal(null)}
        />
      </div>
    </PageLayout>
  )
}

export default AIAgents
