import React, { useEffect, useState } from 'react'
import {
  Users, Calendar, Bed, IndianRupee, AlertCircle, TrendingUp,
  Stethoscope, User, CheckCircle2, BarChart3, Sparkles, ChevronRight, Zap,
  Brain, FlaskConical, HeartPulse,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { SkeletonDashboard } from '../common/SkeletonCard'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { getAdminDashboard } from '../../services/dashboardService'
import { getAdminInsights } from '../../services/aiService'
import { toast } from 'react-toastify'
import api from '../../services/api'
import { useNavigate } from 'react-router-dom'

const STATUS_COLORS = {
  Confirmed: 'bg-emerald-100 text-emerald-700',
  Scheduled: 'bg-[#EBF5FB] text-[#2E86DE]',
  Pending:   'bg-amber-100 text-amber-700',
  Cancelled: 'bg-red-100 text-red-700',
  Completed: 'bg-gray-100 text-gray-600',
}

const ChartTip = ({ active, payload, label, darkMode }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={`px-4 py-3 rounded-xl border shadow-lg text-sm
      ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-[#E2E8F0] text-[#2C3E50]'}`}>
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.stroke || p.fill || p.color }}>
          {p.name}: <span className="font-bold">
            {p.name === 'Revenue' ? `₹${Number(p.value).toLocaleString()}` : p.value}
          </span>
        </p>
      ))}
    </div>
  )
}

const AdminDashboard = () => {
  const { darkMode } = useTheme()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [dashboard, setDashboard]           = useState(null)
  const [loading, setLoading]               = useState(true)
  const [doctorLoad, setDoctorLoad]         = useState([])
  const [recentPatients, setRecentPatients] = useState([])
  const [backendInsights, setBackendInsights] = useState(null)

  useEffect(() => {
    getAdminDashboard()
      .then(res => setDashboard(res.dashboard))
      .catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false))

    getAdminInsights().then(res => setBackendInsights(res?.data || res)).catch(() => {})

    ;(async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const [aptRes, docRes, ptRes] = await Promise.all([
          api.get('/appointments', { params: { date: today, limit: 500 } }),
          api.get('/doctors',      { params: { limit: 200 } }),
          api.get('/patients',     { params: { limit: 6, sort: '-createdAt' } }),
        ])
        const apts = aptRes.data?.data  || aptRes.data  || []
        const docs = docRes.data?.data  || docRes.data  || []
        const pts  = ptRes.data?.patients || ptRes.data?.data || ptRes.data || []

        const countMap = {}
        apts.forEach(a => {
          const id = a.doctor?._id || a.doctor
          if (id) countMap[id] = (countMap[id] || 0) + 1
        })
        setDoctorLoad(
          docs.filter(d => d.isAvailable)
            .map(d => ({ _id: d._id, name: d.userId?.name || 'Unknown', specialization: d.specialization || '—', count: countMap[d._id] || 0 }))
            .sort((a, b) => a.count - b.count)
            .slice(0, 6)
        )
        setRecentPatients(Array.isArray(pts) ? pts.slice(0, 6) : [])
      } catch { /* non-fatal */ }
    })()
  }, [])

  const glass = darkMode
    ? 'bg-gray-800/90 backdrop-blur-md border border-gray-700/60 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)]'
    : 'bg-white/85 backdrop-blur-md border border-white/60 rounded-2xl shadow-[0_8px_32px_rgba(46,134,222,0.08)]'
  const gridStroke = darkMode ? '#374151' : '#f0f4f8'
  const axisColor  = darkMode ? '#6b7280' : '#9ca3af'
  const textCls    = darkMode ? 'text-white' : 'text-[#2C3E50]'
  const subCls     = 'text-[#7B8A8B]'

  if (loading) return <SkeletonDashboard />

  const overview   = dashboard?.overview || {}
  const alerts     = dashboard?.alerts   || {}
  const recentApts = dashboard?.recentActivities?.appointments || []
  const year       = new Date().getFullYear()
  const hour       = new Date().getHours()
  const greeting   = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'
  const firstName  = (user?.name || 'Admin').split(' ')[0]

  const revenueData  = dashboard?.revenue?.monthly || []
  const aptTrendData = dashboard?.weeklyAppointments || []
  const bedData = [
    { name: 'Occupied',  value: overview.occupiedBeds  || 0, color: '#EF4444' },
    { name: 'Available', value: overview.availableBeds || 0, color: '#10B981' },
  ]

  const occupancyPct = overview.totalBeds > 0
    ? Math.round((overview.occupiedBeds / overview.totalBeds) * 100) : 0
  const currentMonth = new Date().getMonth()
  const revLast  = revenueData[currentMonth]?.Revenue || revenueData[revenueData.length - 1]?.Revenue || 0
  const revPrev  = revenueData[currentMonth > 0 ? currentMonth - 1 : 0]?.Revenue || 1
  const revTrend = revPrev > 0 ? Math.round(((revLast - revPrev) / revPrev) * 100) : 0
  const freeDocs = doctorLoad.filter(d => d.count === 0).length
  const totalAlerts = (alerts.lowStockMedicines || 0) + (alerts.expiringMedicines || 0) + (alerts.pendingBills || 0)

  const aiInsights = [
    {
      color: occupancyPct > 85 ? 'red' : occupancyPct > 65 ? 'amber' : 'emerald',
      label: occupancyPct > 85 ? 'Critical' : occupancyPct > 65 ? 'Watch' : 'Healthy',
      text:  `Bed occupancy at ${occupancyPct}%`,
      sub:   occupancyPct > 85 ? 'Approaching full capacity' : occupancyPct > 65 ? 'Monitor admissions' : 'Optimal range',
    },
    {
      color: revTrend >= 0 ? 'emerald' : 'red',
      label: `${revTrend >= 0 ? '+' : ''}${revTrend}% MoM`,
      text:  `Revenue ${revTrend >= 0 ? 'up' : 'down'} vs last month`,
      sub:   `₹${(revLast / 1000).toFixed(0)}k this month`,
    },
    alerts.lowStockMedicines > 0
      ? { color: 'amber', label: 'Restock', text: `${alerts.lowStockMedicines} medicine${alerts.lowStockMedicines > 1 ? 's' : ''} low stock`, sub: 'Reorder before stock-out' }
      : { color: 'emerald', label: 'All Good', text: 'Medicine stock healthy', sub: 'No restocking needed' },
    {
      color: freeDocs > 0 ? 'blue' : 'amber',
      label: 'Today',
      text:  `${overview.todayAppointments || 0} appointments scheduled`,
      sub:   freeDocs > 0 ? `${freeDocs} doctor${freeDocs > 1 ? 's' : ''} with no load` : 'All doctors have load',
    },
  ]

  const colorMap = {
    red:     { dot: 'bg-red-500',     badge: 'bg-red-50 text-red-600',         darkBadge: 'bg-red-500/20 text-red-400'     },
    amber:   { dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-600',     darkBadge: 'bg-amber-500/20 text-amber-400' },
    emerald: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-600', darkBadge: 'bg-emerald-500/20 text-emerald-400' },
    blue:    { dot: 'bg-[#2E86DE]',   badge: 'bg-[#EBF5FB] text-[#2E86DE]',   darkBadge: 'bg-blue-500/20 text-blue-400'   },
  }

  const quickActions = [
    { label: 'Register Patient', path: '/patients',     icon: Users    },
    { label: 'Book Appointment', path: '/appointments', icon: Calendar  },
    { label: 'Manage Wards',     path: '/wards',        icon: Bed       },
    { label: 'View Reports',     path: '/reports',      icon: BarChart3 },
  ]

  const kpiItems = [
    { label: 'Total Patients',  value: (overview.totalPatients || 0).toLocaleString(), icon: Users,       iconColor: '#2E86DE', bg: darkMode ? 'bg-blue-900/30'    : 'bg-blue-50'    },
    { label: 'Appointments',    value: overview.todayAppointments || 0,                icon: Calendar,    iconColor: '#7c3aed', bg: darkMode ? 'bg-violet-900/30'  : 'bg-violet-50'  },
    { label: 'Available Beds',  value: overview.availableBeds || 0,                    icon: Bed,         iconColor: '#10b981', bg: darkMode ? 'bg-emerald-900/30' : 'bg-emerald-50' },
    { label: 'Doctors On Duty', value: doctorLoad.length,                              icon: Stethoscope, iconColor: '#0d9488', bg: darkMode ? 'bg-teal-900/30'    : 'bg-teal-50'    },
    { label: 'Revenue Today',   value: `₹${(dashboard?.revenue?.today || 0).toLocaleString()}`, icon: IndianRupee, iconColor: '#f97316', bg: darkMode ? 'bg-orange-900/30' : 'bg-orange-50' },
    { label: 'Active Alerts',   value: totalAlerts,                                    icon: AlertCircle, iconColor: '#ef4444', bg: darkMode ? 'bg-red-900/30'     : 'bg-red-50'     },
  ]

  const spotlight    = recentPatients[0]
  const spotName     = spotlight?.userId?.name || spotlight?.name || 'Patient'
  const spotInitials = spotName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const spotAge      = spotlight?.dateOfBirth
    ? Math.floor((Date.now() - new Date(spotlight.dateOfBirth)) / (365.25 * 24 * 3600 * 1000))
    : null
  const spotBlood  = spotlight?.bloodGroup || '—'
  const spotGender = spotlight?.gender || spotlight?.userId?.gender || '—'

  return (
    <div className="relative min-h-screen">

      {/* Background glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #2E86DE 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-60 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #1ABC9C 0%, transparent 70%)' }} />
        <div className="absolute bottom-20 left-1/4 w-[400px] h-[400px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #2E86DE 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 space-y-5">

        {/* ── Welcome header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className={`text-3xl font-black tracking-tight ${textCls}`}>
              Good {greeting},{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2E86DE] to-[#1ABC9C]">
                {firstName}
              </span>
            </h1>
            <p className={`text-sm mt-1 ${subCls}`}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className={`flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-full border
            ${darkMode ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Live · All services operational
          </div>
        </div>

        {/* ── KPI mega-numbers strip ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpiItems.map(({ label, value, icon: Icon, iconColor, bg }) => (
            <div key={label} className={`${glass} p-4 flex flex-col gap-3`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg} flex-shrink-0`}>
                <Icon className="w-5 h-5" style={{ color: iconColor }} />
              </div>
              <div>
                <p className={`text-2xl font-black leading-none ${textCls}`}>{value}</p>
                <p className={`text-[11px] mt-1 leading-tight ${subCls}`}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── AI Quick Actions ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: Brain,
              label: 'Symptom Checker',
              desc: 'AI-powered symptom triage to determine urgency and recommend specialists',
              gradient: 'from-violet-500 to-purple-600',
              bg: darkMode ? 'bg-violet-900/20 border-violet-700/40' : 'bg-violet-50 border-violet-200/60',
              iconBg: darkMode ? 'bg-violet-500/20' : 'bg-violet-100',
              iconColor: '#7c3aed',
              action: () => navigate('/appointments'),
            },
            {
              icon: FlaskConical,
              label: 'Report Analyzer',
              desc: 'Instant AI analysis of lab reports with clinical insights and flag anomalies',
              gradient: 'from-teal-500 to-emerald-600',
              bg: darkMode ? 'bg-teal-900/20 border-teal-700/40' : 'bg-teal-50 border-teal-200/60',
              iconBg: darkMode ? 'bg-teal-500/20' : 'bg-teal-100',
              iconColor: '#0d9488',
              action: () => navigate('/test-reports'),
            },
            {
              icon: HeartPulse,
              label: 'Risk Predictor',
              desc: 'Predictive analytics for patient risk scoring based on clinical data trends',
              gradient: 'from-[#2E86DE] to-[#1ABC9C]',
              bg: darkMode ? 'bg-blue-900/20 border-blue-700/40' : 'bg-blue-50 border-blue-200/60',
              iconBg: darkMode ? 'bg-blue-500/20' : 'bg-blue-100',
              iconColor: '#2E86DE',
              action: () => navigate('/reports'),
            },
          ].map(({ icon: Icon, label, desc, bg, iconBg, iconColor, action }) => (
            <button
              key={label}
              onClick={action}
              className={`${glass} p-4 text-left group transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(46,134,222,0.15)] border ${bg}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                  <Icon className="w-5 h-5" style={{ color: iconColor }} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`text-sm font-bold ${textCls}`}>{label}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0
                      ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-[#EBF5FB] text-[#2E86DE]'}`}>
                      AI
                    </span>
                  </div>
                  <p className={`text-[11px] leading-relaxed ${subCls}`}>{desc}</p>
                </div>
                <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5 ${subCls}`} />
              </div>
            </button>
          ))}
        </div>

        {/* ── 3-column layout ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr_280px] gap-5 items-start">

          {/* ════ LEFT PANEL ══════════════════════════════════════════════ */}
          <div className="space-y-4 xl:sticky xl:top-6">

            {/* Patient spotlight */}
            {spotlight && (
              <div className={`${glass} p-5`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${subCls}`}>Latest Patient</p>
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2E86DE] to-[#1ABC9C] flex items-center justify-center text-white font-black text-xl shadow-[0_8px_24px_rgba(46,134,222,0.3)]">
                      {spotInitials}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className={`font-bold text-sm leading-tight ${textCls}`}>{spotName}</p>
                    <p className={`text-xs mt-0.5 ${subCls}`}>{spotGender}{spotAge ? `, ${spotAge} yrs` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold
                      ${darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'}`}>
                      {spotBlood}
                    </span>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold
                      ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-[#EBF5FB] text-[#2E86DE]'}`}>
                      Active
                    </span>
                  </div>
                </div>
                <div className={`grid grid-cols-3 gap-1 mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                  {[
                    { label: 'Patients', value: overview.totalPatients || 0 },
                    { label: 'Today',    value: overview.todayAppointments || 0 },
                    { label: 'Beds',     value: overview.availableBeds || 0 },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <p className={`text-base font-black ${textCls}`}>{value}</p>
                      <p className={`text-[10px] ${subCls}`}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metric progress pills */}
            <div className={`${glass} p-4 space-y-3`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${subCls}`}>Live Metrics</p>
              {[
                {
                  label: 'Bed Occupancy',
                  pct:   occupancyPct,
                  color: occupancyPct > 85 ? '#ef4444' : occupancyPct > 65 ? '#f59e0b' : '#10b981',
                },
                {
                  label: 'Appointment Fill',
                  pct:   overview.todayAppointments ? Math.min(Math.round((overview.todayAppointments / 20) * 100), 100) : 0,
                  color: '#2E86DE',
                },
                {
                  label: 'Revenue Growth',
                  pct:   Math.min(Math.abs(revTrend), 100),
                  color: revTrend >= 0 ? '#10b981' : '#ef4444',
                },
              ].map(({ label, pct, color }) => (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-medium ${textCls}`}>{label}</span>
                    <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className={`${glass} p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-[#2E86DE]" />
                <p className={`text-[10px] font-bold uppercase tracking-widest ${subCls}`}>Quick Actions</p>
              </div>
              <div className="space-y-1.5">
                {quickActions.map(({ label, path, icon: Icon }) => (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                      ${darkMode
                        ? 'text-gray-300 hover:bg-gray-700/60 hover:text-white'
                        : 'text-[#2C3E50] hover:bg-[#EBF5FB] hover:text-[#2E86DE]'}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                      ${darkMode ? 'bg-gray-700' : 'bg-[#EBF5FB]'}`}>
                      <Icon className="w-3.5 h-3.5 text-[#2E86DE]" />
                    </div>
                    {label}
                    <ChevronRight className={`w-4 h-4 ml-auto ${subCls}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ════ CENTER PANEL ════════════════════════════════════════════ */}
          <div className="space-y-5 min-w-0">

            {/* Revenue area chart */}
            <div className={`${glass} p-5`}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className={`text-base font-bold ${textCls}`}>Revenue Overview</h2>
                  <p className={`text-xs mt-0.5 ${subCls}`}>{year} — monthly revenue trend</p>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
                  ${darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                  <TrendingUp className="w-3.5 h-3.5" />
                  {revTrend >= 0 ? '+' : ''}{revTrend}% MoM
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#2E86DE" stopOpacity={darkMode ? 0.28 : 0.16} />
                      <stop offset="95%" stopColor="#2E86DE" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="month" stroke={axisColor} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke={axisColor} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} width={46} />
                  <Tooltip content={<ChartTip darkMode={darkMode} />} />
                  <Area type="monotone" dataKey="Revenue" stroke="#2E86DE" strokeWidth={2.5}
                    fill="url(#revGrad)"
                    dot={{ r: 3.5, fill: '#2E86DE', strokeWidth: 0 }}
                    activeDot={{ r: 5.5, fill: '#2E86DE', stroke: darkMode ? '#1f2937' : '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Appointments + Bed donut */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className={`${glass} p-5 lg:col-span-2`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-base font-bold ${textCls}`}>Recent Appointments</h2>
                  <button onClick={() => navigate('/appointments')}
                    className="text-xs text-[#2E86DE] font-semibold flex items-center gap-0.5 hover:underline">
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2.5">
                  {recentApts.length === 0 ? (
                    <div className="text-center py-10">
                      <Stethoscope className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className={`text-sm ${subCls}`}>No appointments today</p>
                    </div>
                  ) : recentApts.slice(0, 5).map(apt => {
                    const patient = apt.patient?.userId?.name || apt.patient?.patientId || 'Unknown'
                    const doctor  = (apt.doctor?.userId?.name || 'Unknown').replace(/^Dr\.?\s*/i, '').trim()
                    const init    = patient.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    const time    = apt.timeSlot?.startTime || '—'
                    return (
                      <div key={apt._id} className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors
                        ${darkMode ? 'border-gray-700/60 hover:bg-gray-700/40' : 'border-[#E2E8F0]/80 hover:bg-[#F5F7FA]'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2E86DE] to-[#5DADE2] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {init}
                          </div>
                          <div>
                            <p className={`font-semibold text-sm ${textCls}`}>{patient}</p>
                            <p className={`text-xs ${subCls}`}>Dr. {doctor} · {time}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                          ${STATUS_COLORS[apt.status] || STATUS_COLORS.Scheduled}`}>
                          {apt.status}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Bed status donut */}
              <div className={`${glass} p-5`}>
                <h2 className={`text-base font-bold mb-3 ${textCls}`}>Bed Status</h2>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={148}>
                    <PieChart>
                      <Pie data={bedData} cx="50%" cy="50%" innerRadius={40} outerRadius={64} dataKey="value" strokeWidth={0}>
                        {bedData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]}
                        contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: 10, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className={`text-2xl font-black leading-none ${textCls}`}>{overview.occupiedBeds || 0}</p>
                      <p className={`text-[10px] mt-0.5 ${subCls}`}>/ {overview.totalBeds || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2.5 mt-3">
                  {[
                    { label: 'Total Beds', value: overview.totalBeds    || 0, cls: textCls           },
                    { label: 'Occupied',   value: overview.occupiedBeds  || 0, cls: 'text-red-500'    },
                    { label: 'Available',  value: overview.availableBeds || 0, cls: 'text-emerald-500' },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="flex justify-between items-center text-sm">
                      <span className={subCls}>{label}</span>
                      <span className={`font-bold ${cls}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Weekly bar chart */}
            <div className={`${glass} p-5`}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className={`text-base font-bold ${textCls}`}>Weekly Appointments</h2>
                  <p className={`text-xs mt-0.5 ${subCls}`}>This week's scheduling activity</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={aptTrendData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="day" stroke={axisColor} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis stroke={axisColor} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip darkMode={darkMode} />} />
                  <Bar dataKey="Appointments" fill="#5DADE2" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Doctor Load Balancer */}
            {doctorLoad.length > 0 && (
              <div className={`${glass} p-5`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2E86DE] to-[#5DADE2] flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-base font-bold leading-none ${textCls}`}>AI Doctor Load Balancer</h2>
                    <p className={`text-xs mt-0.5 ${subCls}`}>Available doctors sorted by today's appointment load</p>
                  </div>
                  <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0
                    ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-[#EBF5FB] text-[#2E86DE]'}`}>
                    Live · Today
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {doctorLoad.map((doc, i) => {
                    const best     = i === 0
                    const maxCount = Math.max(...doctorLoad.map(d => d.count), 1)
                    const barW     = doc.count === 0 ? 4 : Math.round((doc.count / maxCount) * 100)
                    return (
                      <div key={doc._id} className={`p-4 rounded-xl border transition-all ${
                        best
                          ? darkMode ? 'border-emerald-700/60 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50'
                          : darkMode ? 'border-gray-700/60 hover:bg-gray-700/40' : 'border-[#E2E8F0]/80 hover:bg-[#F5F7FA]'
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                            best ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : 'bg-gradient-to-br from-[#2E86DE] to-[#5DADE2]'
                          }`}>
                            <User className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={`text-sm font-semibold truncate ${textCls}`}>{doc.name}</p>
                              {best && <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0">Best</span>}
                            </div>
                            <p className={`text-xs truncate ${subCls}`}>{doc.specialization}</p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className={`text-xs ${subCls}`}>Today's load</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-bold ${doc.count === 0 ? 'text-emerald-600' : doc.count < 5 ? 'text-amber-600' : 'text-red-600'}`}>
                                {doc.count} apt{doc.count !== 1 ? 's' : ''}
                              </span>
                              {doc.count === 0 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                            </div>
                          </div>
                          <div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <div className={`h-full rounded-full transition-all duration-500 ${
                              doc.count === 0 ? 'bg-emerald-500' : doc.count < 5 ? 'bg-amber-400' : 'bg-red-400'
                            }`} style={{ width: `${Math.max(barW, 4)}%` }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ════ RIGHT PANEL ══════════════════════════════════════════════ */}
          <div className="space-y-4 xl:sticky xl:top-6">

            {/* Dark AI Insights panel */}
            <div className="rounded-2xl p-5 bg-[#1e293b] shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <h3 className="text-sm font-bold text-white">AI Insights</h3>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-500/20 text-blue-400">
                  Live
                </span>
              </div>
              <div className="space-y-2.5">
                {(backendInsights?.actionItems?.length
                  ? backendInsights.actionItems.map((item, i) => {
                      const sev = item.severity
                      const color = sev === 'critical' ? 'red' : sev === 'warning' ? 'amber' : 'blue'
                      const cm = colorMap[color]
                      const actionPath = { pharmacy: '/pharmacy', wards: '/wards', billing: '/billing', patients: '/patients' }[item.action] || null
                      return (
                        <button
                          key={i}
                          onClick={() => actionPath && navigate(actionPath)}
                          className={`w-full flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 text-left transition-all ${actionPath ? 'hover:bg-white/10 cursor-pointer' : 'cursor-default'}`}
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cm.dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-0.5">
                              <p className="text-xs font-semibold leading-snug text-white">{item.message}</p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${cm.darkBadge}`}>
                                {sev}
                              </span>
                            </div>
                            {actionPath && <p className="text-[11px] text-gray-400">Click to view →</p>}
                          </div>
                        </button>
                      )
                    })
                  : aiInsights.map((ins, i) => {
                      const cm = colorMap[ins.color] || colorMap.blue
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cm.dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-0.5">
                              <p className="text-xs font-semibold leading-snug text-white">{ins.text}</p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${cm.darkBadge}`}>
                                {ins.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400">{ins.sub}</p>
                          </div>
                        </div>
                      )
                    })
                )}
              </div>
              {backendInsights?.riskPatients?.filter(p => p.riskLevel === 'High').length > 0 && (
                <button
                  onClick={() => navigate('/patients')}
                  className="w-full mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-left hover:bg-red-500/20 transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-400 font-semibold flex-1">
                    {backendInsights.riskPatients.filter(p => p.riskLevel === 'High').length} high-risk patient{backendInsights.riskPatients.filter(p => p.riskLevel === 'High').length > 1 ? 's' : ''} need monitoring
                  </p>
                  <ChevronRight className="w-3.5 h-3.5 text-red-400" />
                </button>
              )}
            </div>

            {/* Recent Patients */}
            <div className={`${glass} p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-bold ${textCls}`}>Recent Patients</h3>
                <button onClick={() => navigate('/patients')}
                  className="text-xs text-[#2E86DE] font-semibold hover:underline">
                  View all
                </button>
              </div>
              <div className="space-y-1.5">
                {recentPatients.length === 0 ? (
                  <p className={`text-xs text-center py-4 ${subCls}`}>No patients found</p>
                ) : recentPatients.map(pt => {
                  const name     = pt.userId?.name || pt.name || 'Patient'
                  const gender   = pt.gender || ''
                  const age      = pt.dateOfBirth
                    ? Math.floor((Date.now() - new Date(pt.dateOfBirth)) / (365.25 * 24 * 3600 * 1000))
                    : null
                  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  return (
                    <div key={pt._id}
                      onClick={() => navigate('/patients')}
                      className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors cursor-pointer
                        ${darkMode ? 'hover:bg-gray-700/40' : 'hover:bg-[#F5F7FA]'}`}>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2E86DE] to-[#5DADE2] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${textCls}`}>{name}</p>
                        <p className={`text-xs truncate ${subCls}`}>{gender}{age ? `${gender ? ', ' : ''}${age} yrs` : ''}</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${subCls}`} />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Alerts */}
            {(alerts.lowStockMedicines > 0 || alerts.expiringMedicines > 0 || alerts.pendingBills > 0) && (
              <div className={`${glass} p-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <h3 className={`text-sm font-bold ${textCls}`}>Alerts</h3>
                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full
                    ${darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'}`}>
                    {totalAlerts}
                  </span>
                </div>
                <div className="space-y-2">
                  {alerts.lowStockMedicines > 0 && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                      ${darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-700'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                      {alerts.lowStockMedicines} low-stock medicine{alerts.lowStockMedicines > 1 ? 's' : ''}
                    </div>
                  )}
                  {alerts.expiringMedicines > 0 && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                      ${darkMode ? 'bg-orange-900/20 text-orange-400' : 'bg-orange-50 text-orange-700'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                      {alerts.expiringMedicines} expiring within 30 days
                    </div>
                  )}
                  {alerts.pendingBills > 0 && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                      ${darkMode ? 'bg-amber-900/20 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      {alerts.pendingBills} pending bill{alerts.pendingBills > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
