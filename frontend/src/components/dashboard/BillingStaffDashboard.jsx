import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CircleDollarSign, FileText, IndianRupee, Receipt, RefreshCw } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { getAllBills, getBillingStats } from '../../services/billingService'
import { SkeletonDashboard } from '../common/SkeletonCard'

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0))

const BillingStaffDashboard = () => {
  const { darkMode } = useTheme()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [statsResponse, billsResponse] = await Promise.all([getBillingStats(), getAllBills({ limit: 6 })])
      setData({ stats: statsResponse.data || {}, bills: billsResponse.bills || [] })
    } catch (err) {
      setError(err.message || 'Unable to load billing data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  if (loading) return <SkeletonDashboard />

  const text = darkMode ? 'text-white' : 'text-gray-900'
  const card = darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white shadow-sm'
  if (error) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className={`max-w-md rounded-2xl border p-8 text-center ${card}`}>
        <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
        <h1 className={`mt-3 text-xl font-bold ${text}`}>Billing workspace unavailable</h1>
        <p className="mt-2 text-sm text-gray-500">{error}</p>
        <button onClick={load} className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Retry</button>
      </div>
    </div>
  )

  const stats = data?.stats || {}
  const bills = data?.bills || []
  const kpis = [
    { label: 'Total invoices', value: stats.totalBills || 0, icon: Receipt },
    { label: 'Total billed', value: money(stats.totalRevenue), icon: FileText },
    { label: 'Collected', value: money(stats.totalCollected), icon: CircleDollarSign },
    { label: 'Outstanding', value: money(stats.totalPending), icon: IndianRupee },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className={`text-2xl font-bold ${text}`}>Billing Staff Dashboard</h1><p className="mt-1 text-sm text-gray-500">Invoice, collection, and outstanding-payment overview</p></div>
        <button onClick={() => navigate('/billing')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Receipt size={17} /> Open billing workspace</button>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon }) => <div key={label} className={`rounded-xl border p-4 ${card}`}><Icon className="mb-3 h-9 w-9 rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/30"/><p className={`text-xl font-bold ${text}`}>{value}</p><p className="text-xs text-gray-500">{label}</p></div>)}
      </div>
      <div className={`rounded-xl border p-5 ${card}`}>
        <div className="mb-4 flex items-center justify-between"><div><h2 className={`font-bold ${text}`}>Recent invoices</h2><p className="text-xs text-gray-500">Latest billing records</p></div><button onClick={load} aria-label="Refresh billing dashboard" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><RefreshCw size={16}/></button></div>
        {bills.length === 0 ? <div className="py-10 text-center"><Receipt className="mx-auto h-10 w-10 text-gray-300"/><p className={`mt-3 font-semibold ${text}`}>No invoices found</p><p className="mt-1 text-sm text-gray-500">Generated invoices will appear here.</p></div> : <div className="divide-y divide-gray-100 dark:divide-gray-700">{bills.map((bill) => <div key={bill._id} className="flex items-center justify-between gap-4 py-3"><div><p className={`text-sm font-semibold ${text}`}>{bill.billNumber}</p><p className="text-xs text-gray-500">{bill.patient?.userId?.name || bill.patient?.patientId || 'Unknown patient'}</p></div><div className="text-right"><p className={`text-sm font-bold ${text}`}>{money(bill.totalAmount)}</p><span className="text-xs text-gray-500">{String(bill.paymentStatus || '').replaceAll('_', ' ')}</span></div></div>)}</div>}
      </div>
    </div>
  )
}

export default BillingStaffDashboard
