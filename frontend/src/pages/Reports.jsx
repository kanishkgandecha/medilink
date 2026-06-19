import React, { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, Calendar, DollarSign, Activity } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import PageLayout from '../components/common/PageLayout'
import StatCard from '../components/common/StatCard'
import * as reportService from '../services/reportService'
import { toast } from 'react-toastify'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const getDateBounds = (range) => {
  const end = new Date()
  const start = new Date()
  switch (range) {
    case 'week':    start.setDate(start.getDate() - 7); break
    case 'month':   start.setMonth(start.getMonth() - 1); break
    case 'quarter': start.setMonth(start.getMonth() - 3); break
    case 'year':    start.setFullYear(start.getFullYear() - 1); break
    default:        start.setMonth(start.getMonth() - 1)
  }
  return {
    startDate: start.toISOString().split('T')[0],
    endDate:   end.toISOString().split('T')[0]
  }
}

const monthKey = (dateStr) => {
  const d = new Date(dateStr)
  return MONTH_SHORT[d.getMonth()]
}

const Reports = () => {
  const { darkMode } = useTheme()
  const [dateRange, setDateRange] = useState('month')
  const [loading, setLoading] = useState(true)

  const [summary, setSummary] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    appointmentsToday: 0,
    periodRevenue: 0
  })
  const [revenueData, setRevenueData] = useState([])
  const [appointmentData, setAppointmentData] = useState([])

  const card = `border rounded-xl p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)]'}`
  const text = darkMode ? 'text-white' : 'text-gray-800'
  const gridStroke = darkMode ? '#374151' : '#e5e7eb'
  const axisStroke = darkMode ? '#9ca3af' : '#6b7280'
  const tooltipStyle = {
    backgroundColor: darkMode ? '#1f2937' : '#ffffff',
    border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
    borderRadius: '8px'
  }

  useEffect(() => {
    fetchAll()
  }, [dateRange])

  const fetchAll = async () => {
    setLoading(true)
    const { startDate, endDate } = getDateBounds(dateRange)

    try {
      const [dashRes, revRes, apptRes] = await Promise.allSettled([
        reportService.getDashboardReport(),
        reportService.getRevenueReport({ startDate, endDate }),
        reportService.getPatientVisitReport({ startDate, endDate })
      ])

      // Summary cards from dashboard endpoint
      if (dashRes.status === 'fulfilled') {
        const s = dashRes.value?.stats || {}
        setSummary(prev => ({
          ...prev,
          totalPatients: s.patients?.total ?? prev.totalPatients,
          totalDoctors: s.doctors?.total ?? prev.totalDoctors,
          appointmentsToday: s.appointments?.today ?? prev.appointmentsToday
        }))
      }

      // Revenue chart: group bills by month
      if (revRes.status === 'fulfilled') {
        const bills = revRes.value?.data || []
        const statsData = revRes.value?.stats || {}
        setSummary(prev => ({ ...prev, periodRevenue: statsData.totalRevenue || prev.periodRevenue }))

        const grouped = {}
        bills.forEach(bill => {
          const m = monthKey(bill.billDate)
          if (!grouped[m]) grouped[m] = { month: m, revenue: 0, collected: 0 }
          grouped[m].revenue   += bill.totalAmount || 0
          grouped[m].collected += bill.amountPaid  || 0
        })
        setRevenueData(Object.values(grouped))
      }

      // Appointment chart: group appointments by month
      if (apptRes.status === 'fulfilled') {
        const apts = apptRes.value?.data || []
        const grouped = {}
        apts.forEach(apt => {
          const m = monthKey(apt.appointmentDate)
          if (!grouped[m]) grouped[m] = { month: m, total: 0, completed: 0, cancelled: 0 }
          grouped[m].total++
          if (apt.status === 'Completed') grouped[m].completed++
          if (apt.status === 'Cancelled') grouped[m].cancelled++
        })
        setAppointmentData(Object.values(grouped))
      }
    } catch {
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${text}`}>Reports & Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Live hospital statistics and insights</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className={`px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200
            ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`}
        >
          <option value="week">Last 7 Days</option>
          <option value="month">Last Month</option>
          <option value="quarter">Last Quarter</option>
          <option value="year">Last Year</option>
        </select>
      </div>

      <PageLayout leftPanel={
        <div className="space-y-3">
          <StatCard title="Total Patients"    value={summary.totalPatients}                                        icon={Users}      iconBg="bg-emerald-50 text-emerald-600" />
          <StatCard title="Active Doctors"    value={summary.totalDoctors}                                         icon={Activity}   iconBg="bg-blue-50 text-[#2E86DE]"      />
          <StatCard title="Appts Today"       value={summary.appointmentsToday}                                    icon={Calendar}   iconBg="bg-violet-50 text-violet-600"   />
          <StatCard title="Revenue (Period)"  value={`₹${(summary.periodRevenue || 0).toLocaleString()}`}          icon={DollarSign} iconBg="bg-orange-50 text-orange-600"  />
        </div>
      }>

      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className={card}>
            <h2 className={`text-xl font-bold mb-4 ${text}`}>Revenue vs Collected</h2>
            {revenueData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-400">No revenue data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="month" stroke={axisStroke} />
                  <YAxis stroke={axisStroke} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`₹${v.toLocaleString()}`, '']} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue"   stroke="#3b82f6" strokeWidth={2} name="Billed" />
                  <Line type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2} name="Collected" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Appointment Chart */}
          <div className={card}>
            <h2 className={`text-xl font-bold mb-4 ${text}`}>Appointment Statistics</h2>
            {appointmentData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-400">No appointment data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={appointmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="month" stroke={axisStroke} />
                  <YAxis stroke={axisStroke} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="completed" fill="#10b981" name="Completed" />
                  <Bar dataKey="cancelled" fill="#ef4444" name="Cancelled" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      </PageLayout>
    </div>
  )
}

export default Reports
