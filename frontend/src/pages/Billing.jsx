import React, { useState, useEffect } from 'react'
import {
  Plus, DollarSign, FileText, Download, Eye, CreditCard,
  CheckCircle, Clock, Trash2, User, Calendar, Pill,
  Stethoscope, FlaskConical, Receipt, IndianRupee
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import TableComponent from '../components/common/TableComponent'
import Modal from '../components/common/Modal'
import { toast } from 'react-toastify'
import * as billingService from '../services/billingService'

// ─── Constants ────────────────────────────────────────────────
const BILL_TYPES = ['Consultation', 'Pharmacy', 'Test', 'Other']

const BILL_TYPE_META = {
  Consultation: { icon: Stethoscope, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  Pharmacy:     { icon: Pill,         color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  Test:         { icon: FlaskConical, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  Other:        { icon: Receipt,      color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' }
}

const STATUS_COLOR = {
  Paid:            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Partially-Paid':'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Unpaid:          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Refunded:        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
}

const SERVICE_TEMPLATES = [
  { name: 'General Consultation',       category: 'Consultation', price: 500   },
  { name: 'Specialist Consultation',    category: 'Consultation', price: 1000  },
  { name: 'Complete Blood Count (CBC)', category: 'Lab Test',     price: 300   },
  { name: 'Blood Sugar Test',           category: 'Lab Test',     price: 150   },
  { name: 'Lipid Profile',              category: 'Lab Test',     price: 800   },
  { name: 'X-Ray Chest',               category: 'Imaging',      price: 500   },
  { name: 'Ultrasound',                category: 'Imaging',      price: 1200  },
  { name: 'CT Scan',                   category: 'Imaging',      price: 3500  },
  { name: 'MRI Scan',                  category: 'Imaging',      price: 5000  },
  { name: 'ECG',                       category: 'Lab Test',     price: 200   },
  { name: 'Room Charges (General)',     category: 'Room Charges', price: 1000  },
  { name: 'Room Charges (Private)',     category: 'Room Charges', price: 2500  },
  { name: 'Room Charges (ICU)',         category: 'Room Charges', price: 5000  },
  { name: 'Emergency Service',          category: 'Emergency',    price: 1500  },
  { name: 'Minor Surgery',             category: 'Surgery',      price: 15000 },
  { name: 'Major Surgery',             category: 'Surgery',      price: 50000 },
  { name: 'Medicines (Custom)',         category: 'Medicine',     price: 0     }
]

const EMPTY_GENERATE = {
  patient:  '',
  billType: 'Other',
  items:    [],
  discount: 0,
  tax:      0,
  notes:    ''
}

const EMPTY_ITEM = { description: '', category: 'Consultation', quantity: 1, unitPrice: 0 }

// ─── Small helpers ─────────────────────────────────────────────
const BillTypeBadge = ({ type }) => {
  const meta = BILL_TYPE_META[type] || BILL_TYPE_META.Other
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
      <Icon className="w-3 h-3" />
      {type || 'Other'}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const Billing = () => {
  const { darkMode } = useTheme()
  const { user } = useAuth()

  const isPatient     = user?.role === 'Patient'
  const isPharmacist  = user?.role === 'Pharmacist' || user?.subRole === 'Pharmacist'
  const canCreateBill = ['Admin','Receptionist'].includes(user?.role) ||
                        ['Admin','Receptionist'].includes(user?.subRole) ||
                        isPharmacist
  const canManageAll  = ['Admin','Receptionist'].includes(user?.role) ||
                        ['Admin','Receptionist'].includes(user?.subRole)

  // ── State ────────────────────────────────────────────────────
  const [bills, setBills]           = useState([])
  const [patients, setPatients]     = useState([])
  const [loading, setLoading]       = useState(false)
  const [stats, setStats]           = useState({ totalRevenue: 0, totalCollected: 0, totalPending: 0, totalBills: 0 })
  const [billTypeFilter, setBillTypeFilter] = useState('All')
  const [patientTab, setPatientTab] = useState('unpaid')

  // Modals
  const [selectedBill, setSelectedBill]             = useState(null)
  const [showInvoiceModal, setShowInvoiceModal]     = useState(false)
  const [showPaymentModal, setShowPaymentModal]     = useState(false)
  const [showGenerateModal, setShowGenerateModal]   = useState(false)
  const [showInsuranceModal, setShowInsuranceModal] = useState(false)
  const [showPayNowModal, setShowPayNowModal]       = useState(false)

  // Form state
  const [generateData, setGenerateData] = useState(EMPTY_GENERATE)
  const [newItem, setNewItem]           = useState(EMPTY_ITEM)
  const [paymentData, setPaymentData]   = useState({ amount: '', paymentMethod: '', transactionId: '', notes: '' })
  const [insuranceData, setInsuranceData] = useState({ claimNumber: '', provider: '', amountClaimed: '' })
  const [payNowMethod, setPayNowMethod] = useState('UPI')
  const [submitting, setSubmitting]     = useState(false)

  // ── Helpers ──────────────────────────────────────────────────
  const inp = `w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 ${
    darkMode ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'
  }`
  const lbl = `block text-xs font-semibold uppercase tracking-wide mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`
  const card = `border rounded-2xl ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-sm'}`

  // ── Data fetching ────────────────────────────────────────────
  useEffect(() => {
    fetchBills()
    if (!isPatient) {
      fetchPatients()
      fetchStats()
    }
  }, []) // eslint-disable-line

  // Derive patient stats from bill list
  useEffect(() => {
    if (isPatient && bills.length > 0) {
      setStats({
        totalRevenue:   bills.reduce((s, b) => s + (b.totalAmount || 0), 0),
        totalCollected: bills.reduce((s, b) => s + (b.amountPaid || 0), 0),
        totalPending:   bills.reduce((s, b) => s + (b.balance || 0), 0),
        totalBills:     bills.length
      })
    }
  }, [bills, isPatient])

  const fetchBills = async () => {
    setLoading(true)
    try {
      const res = await billingService.getAllBills({ limit: 500 })
      setBills(res.bills || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch bills')
    } finally {
      setLoading(false)
    }
  }

  const fetchPatients = async () => {
    try {
      const res = await billingService.getAllPatients({ limit: 1000 })
      setPatients(res.data || [])
    } catch { /* non-fatal */ }
  }

  const fetchStats = async () => {
    try {
      const res = await billingService.getBillingStats()
      const d = res.data || {}
      setStats({
        totalRevenue:   d.totalRevenue   || 0,
        totalCollected: d.totalCollected || 0,
        totalPending:   d.totalPending   || 0,
        totalBills:     d.totalBills     || 0
      })
    } catch { /* keep zeros */ }
  }

  // ── Bill CRUD ────────────────────────────────────────────────
  const handleGenerateBill = async () => {
    if (!generateData.patient) return toast.error('Please select a patient')
    if (generateData.items.length === 0) return toast.error('Please add at least one item')

    const selected = patients.find(p => p._id === generateData.patient)
    if (!selected) return toast.error('Patient not found')
    if (!selected.userId?._id) return toast.error('Invalid patient data')

    setSubmitting(true)
    try {
      const effectiveBillType = isPharmacist ? 'Pharmacy' : generateData.billType
      await billingService.createBill({
        patient:  selected.userId._id,
        billType: effectiveBillType,
        items:    generateData.items,
        discount: parseFloat(generateData.discount) || 0,
        tax:      parseFloat(generateData.tax)      || 0,
        notes:    generateData.notes
      })
      toast.success('Bill created successfully')
      setShowGenerateModal(false)
      resetGenerateForm()
      fetchBills()
      if (!isPatient) fetchStats()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create bill')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRecordPayment = async () => {
    if (!paymentData.amount || paymentData.amount <= 0) return toast.error('Enter a valid amount')
    if (!paymentData.paymentMethod) return toast.error('Select a payment method')
    setSubmitting(true)
    try {
      await billingService.recordPayment(selectedBill._id, {
        amount:        parseFloat(paymentData.amount),
        paymentMethod: paymentData.paymentMethod,
        transactionId: paymentData.transactionId,
        notes:         paymentData.notes
      })
      toast.success('Payment recorded successfully')
      setShowPaymentModal(false)
      setPaymentData({ amount: '', paymentMethod: '', transactionId: '', notes: '' })
      fetchBills()
      fetchStats()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePatientPay = async () => {
    if (!payNowMethod) return toast.error('Please select a payment method')
    setSubmitting(true)
    try {
      await billingService.patientPayBill(selectedBill._id, payNowMethod)
      toast.success('Payment successful! Your bill is now paid.')
      setShowPayNowModal(false)
      fetchBills()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleProcessInsurance = async () => {
    if (!insuranceData.claimNumber || !insuranceData.provider || !insuranceData.amountClaimed) {
      return toast.error('Please fill all insurance fields')
    }
    setSubmitting(true)
    try {
      await billingService.processInsuranceClaim(selectedBill._id, {
        claimNumber:   insuranceData.claimNumber,
        provider:      insuranceData.provider,
        amountClaimed: parseFloat(insuranceData.amountClaimed)
      })
      toast.success('Insurance claim submitted')
      setShowInsuranceModal(false)
      setInsuranceData({ claimNumber: '', provider: '', amountClaimed: '' })
      fetchBills()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit claim')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteBill = async (id) => {
    if (!window.confirm('Delete this bill?')) return
    try {
      await billingService.deleteBill(id)
      toast.success('Bill deleted')
      fetchBills()
      fetchStats()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete bill')
    }
  }

  // ── Item helpers ─────────────────────────────────────────────
  const addItem = () => {
    if (!newItem.description || newItem.unitPrice <= 0) {
      return toast.error('Enter a valid item name and price')
    }
    setGenerateData(prev => ({ ...prev, items: [...prev.items, { ...newItem }] }))
    setNewItem(EMPTY_ITEM)
  }

  const removeItem = (i) =>
    setGenerateData(prev => ({ ...prev, items: prev.items.filter((_, idx) => idx !== i) }))

  const calcTotal = () => {
    const subtotal = generateData.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0)
    const discount = parseFloat(generateData.discount) || 0
    const tax      = parseFloat(generateData.tax)      || 0
    return { subtotal, discount, tax, total: subtotal - discount + tax }
  }

  const resetGenerateForm = () => {
    setGenerateData(EMPTY_GENERATE)
    setNewItem(EMPTY_ITEM)
  }

  // ── Filtered bill lists ───────────────────────────────────────
  const filteredBills = billTypeFilter === 'All'
    ? bills
    : bills.filter(b => b.billType === billTypeFilter)

  const unpaidBills = bills.filter(b => b.paymentStatus !== 'Paid' && b.paymentStatus !== 'Refunded')
  const paidBills   = bills.filter(b => b.paymentStatus === 'Paid' || b.paymentStatus === 'Refunded')

  // ── Table columns (Admin/Pharmacist) ──────────────────────────
  const columns = [
    { header: 'Bill #', accessor: 'billNumber' },
    {
      header: 'Type', accessor: 'billType',
      render: (row) => <BillTypeBadge type={row.billType} />
    },
    {
      header: 'Patient', accessor: 'patient',
      render: (row) => (
        <div>
          <p className="font-medium text-sm">{row.patient?.userId?.name || 'Unknown'}</p>
          <p className="text-xs text-gray-500">{row.patient?.patientId || 'N/A'}</p>
        </div>
      )
    },
    {
      header: 'Date', accessor: 'billDate',
      render: (row) => <span className="text-sm">{new Date(row.billDate || row.createdAt).toLocaleDateString()}</span>
    },
    {
      header: 'Total', accessor: 'totalAmount',
      render: (row) => <span className="font-semibold text-sm">₹{(row.totalAmount || 0).toFixed(2)}</span>
    },
    {
      header: 'Paid', accessor: 'amountPaid',
      render: (row) => <span className="text-green-600 font-semibold text-sm">₹{(row.amountPaid || 0).toFixed(2)}</span>
    },
    {
      header: 'Balance', accessor: 'balance',
      render: (row) => (
        <span className={`font-semibold text-sm ${row.balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
          ₹{(row.balance || 0).toFixed(2)}
        </span>
      )
    },
    {
      header: 'Status', accessor: 'paymentStatus',
      render: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[row.paymentStatus] || STATUS_COLOR.Unpaid}`}>
          {row.paymentStatus}
        </span>
      )
    },
    {
      header: 'Actions', accessor: 'actions',
      render: (row) => (
        <div className="flex space-x-1">
          <button
            onClick={() => { setSelectedBill(row); setShowInvoiceModal(true) }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
            title="View Invoice"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Admin/Receptionist payment actions */}
          {canManageAll && row.balance > 0 && (
            <>
              <button
                onClick={() => { setSelectedBill(row); setPaymentData(p => ({ ...p, amount: row.balance })); setShowPaymentModal(true) }}
                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition"
                title="Record Payment"
              >
                <CreditCard className="w-3.5 h-3.5" />
              </button>
              {!row.insuranceClaim && (
                <button
                  onClick={() => { setSelectedBill(row); setInsuranceData(d => ({ ...d, amountClaimed: row.balance.toString() })); setShowInsuranceModal(true) }}
                  className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition"
                  title="Insurance Claim"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}

          {/* Admin delete (unpaid only) */}
          {['Admin'].includes(user?.role) && row.amountPaid === 0 && (
            <button
              onClick={() => handleDeleteBill(row._id)}
              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )
    }
  ]

  // ─────────────────────────────────────────────────────────────
  // SHARED STATS CARDS
  // ─────────────────────────────────────────────────────────────
  const StatsRow = ({ patientMode = false }) => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: patientMode ? 'Total Billed'  : 'Total Revenue',  value: `₹${(stats.totalRevenue   || 0).toLocaleString()}`, icon: DollarSign,  bg: 'bg-blue-100 dark:bg-blue-900/30',   color: 'text-blue-600'   },
        { label: patientMode ? 'Amount Paid'   : 'Collected',      value: `₹${(stats.totalCollected || 0).toLocaleString()}`, icon: CheckCircle, bg: 'bg-green-100 dark:bg-green-900/30', color: 'text-green-600'  },
        { label: patientMode ? 'Balance Due'   : 'Pending',        value: `₹${(stats.totalPending   || 0).toLocaleString()}`, icon: Clock,       bg: 'bg-red-100 dark:bg-red-900/30',    color: 'text-red-600'    },
        { label: patientMode ? 'My Bills'      : 'Total Invoices', value:    (stats.totalBills       || 0),                   icon: FileText,    bg: 'bg-purple-100 dark:bg-purple-900/30', color: 'text-purple-600' }
      ].map(({ label, value, icon: Icon, bg, color }) => (
        <div key={label} className={`${card} p-5`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <h3 className={`text-xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{value}</h3>
            </div>
            <div className={`p-2.5 ${bg} rounded-lg`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  // ─────────────────────────────────────────────────────────────
  // GENERATE BILL MODAL (shared by Admin/Receptionist/Pharmacist)
  // ─────────────────────────────────────────────────────────────
  const GenerateModal = () => (
    <Modal
      isOpen={showGenerateModal}
      onClose={() => { setShowGenerateModal(false); resetGenerateForm() }}
      title={isPharmacist ? 'Create Pharmacy Bill' : 'Generate Invoice'}
      size="xl"
    >
      <div className="space-y-4 max-h-[68vh] overflow-y-auto pr-1">
        {/* Patient select */}
        <div>
          <label className={lbl}><User className="w-4 h-4 inline mr-1" />Select Patient *</label>
          <select
            value={generateData.patient}
            onChange={e => setGenerateData(p => ({ ...p, patient: e.target.value }))}
            className={inp}
          >
            <option value="">— Select patient ({patients.length} available) —</option>
            {patients.map(pt => (
              <option key={pt._id} value={pt._id}>
                {pt.userId?.name || 'Unknown'} — {pt.patientId || 'N/A'}
              </option>
            ))}
          </select>
        </div>

        {/* Bill type (locked to Pharmacy for pharmacist) */}
        {isPharmacist ? (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
            <Pill className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">Bill type locked to Pharmacy</span>
          </div>
        ) : (
          <div>
            <label className={lbl}>Bill Type</label>
            <div className="grid grid-cols-4 gap-2">
              {BILL_TYPES.map(type => {
                const meta = BILL_TYPE_META[type]
                const Icon = meta.icon
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setGenerateData(p => ({ ...p, billType: type }))}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition ${
                      generateData.billType === type
                        ? 'bg-blue-600 text-white border-blue-600'
                        : darkMode
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {type}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Add item row */}
        <div className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-50'}`}>
          <p className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Add Item</p>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-4">
              <label className="block text-xs text-gray-500 mb-1">Service / Item</label>
              <select
                value={newItem.description}
                onChange={e => {
                  const tmpl = SERVICE_TEMPLATES.find(t => t.name === e.target.value)
                  setNewItem(it => ({
                    ...it,
                    description: e.target.value,
                    category:   tmpl?.category || 'Other',
                    unitPrice:  tmpl?.price    || 0
                  }))
                }}
                className={`w-full px-3 py-2 rounded-lg border text-xs ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">Select template…</option>
                {SERVICE_TEMPLATES.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div className="col-span-3">
              <label className="block text-xs text-gray-500 mb-1">Custom name</label>
              <input
                type="text"
                value={newItem.description}
                onChange={e => setNewItem(it => ({ ...it, description: e.target.value }))}
                placeholder="or type custom…"
                className={`w-full px-3 py-2 rounded-lg border text-xs ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Qty</label>
              <input
                type="number" min="1"
                value={newItem.quantity}
                onChange={e => setNewItem(it => ({ ...it, quantity: parseInt(e.target.value) || 1 }))}
                className={`w-full px-3 py-2 rounded-lg border text-xs ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Price (₹)</label>
              <input
                type="number" min="0" step="0.01"
                value={newItem.unitPrice}
                onChange={e => setNewItem(it => ({ ...it, unitPrice: parseFloat(e.target.value) || 0 }))}
                className={`w-full px-3 py-2 rounded-lg border text-xs ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            <div className="col-span-1 flex items-end">
              <button
                onClick={addItem}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs font-semibold"
              >
                <Plus className="w-4 h-4 mx-auto" />
              </button>
            </div>
          </div>
        </div>

        {/* Items list */}
        {generateData.items.length > 0 && (
          <div className={`rounded-lg border overflow-hidden ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <table className="w-full text-sm">
              <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  {['Description','Qty','Price','Amount',''].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {generateData.items.map((item, i) => (
                  <tr key={i} className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                    <td className="px-4 py-2">{item.description}</td>
                    <td className="px-4 py-2 text-center">{item.quantity}</td>
                    <td className="px-4 py-2 text-right">₹{item.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right font-semibold">₹{(item.quantity * item.unitPrice).toFixed(2)}</td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Discount / tax / total */}
        {generateData.items.length > 0 && (
          <div className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-50'}`}>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Discount (₹)</label>
                <input type="number" min="0" step="0.01" value={generateData.discount}
                  onChange={e => setGenerateData(p => ({ ...p, discount: e.target.value }))}
                  className={`${inp} text-xs`} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tax (₹)</label>
                <input type="number" min="0" step="0.01" value={generateData.tax}
                  onChange={e => setGenerateData(p => ({ ...p, tax: e.target.value }))}
                  className={`${inp} text-xs`} />
              </div>
            </div>
            <div className="space-y-1 pt-2 border-t border-gray-300 dark:border-gray-600 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₹{calcTotal().subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="text-red-500">-₹{calcTotal().discount.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>+₹{calcTotal().tax.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-gray-300 dark:border-gray-600 pt-1">
                <span>Total</span><span className="text-blue-600">₹{calcTotal().total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className={lbl}>Notes (optional)</label>
          <textarea rows="2" value={generateData.notes}
            onChange={e => setGenerateData(p => ({ ...p, notes: e.target.value }))}
            className={inp} placeholder="Additional notes…" />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-5">
        <button onClick={() => { setShowGenerateModal(false); resetGenerateForm() }}
          className={`px-5 py-2 rounded-lg border text-sm ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'} transition`}>
          Cancel
        </button>
        <button onClick={handleGenerateBill} disabled={submitting}
          className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm rounded-lg hover:from-blue-700 hover:to-cyan-700 transition disabled:opacity-50">
          {submitting ? 'Creating…' : 'Create Bill'}
        </button>
      </div>
    </Modal>
  )

  // ─────────────────────────────────────────────────────────────
  // INVOICE MODAL
  // ─────────────────────────────────────────────────────────────
  const InvoiceModal = () => (
    <Modal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title="Invoice Details" size="xl">
      {selectedBill && (
        <div className="space-y-5">
          <div className="flex justify-between items-start pb-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                #{selectedBill.billNumber}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {new Date(selectedBill.billDate || selectedBill.createdAt).toLocaleDateString()}
              </p>
              <div className="mt-2"><BillTypeBadge type={selectedBill.billType} /></div>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_COLOR[selectedBill.paymentStatus] || ''}`}>
              {selectedBill.paymentStatus}
            </span>
          </div>

          {/* Patient */}
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {selectedBill.patient?.userId?.name || 'Unknown'}
            </p>
            <p className="text-sm text-gray-500">Patient ID: {selectedBill.patient?.patientId || 'N/A'}</p>
            {selectedBill.createdByRole && (
              <p className="text-xs text-gray-400 mt-1">Billed by: {selectedBill.createdByRole}</p>
            )}
          </div>

          {/* Items */}
          <div className={`rounded-lg border overflow-hidden ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <table className="w-full text-sm">
              <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  {['Description','Category','Qty','Unit Price','Amount'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {selectedBill.items?.map((item, i) => (
                  <tr key={i} className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                    <td className="px-4 py-2.5">{item.description}</td>
                    <td className="px-4 py-2.5 text-gray-500">{item.category}</td>
                    <td className="px-4 py-2.5 text-center">{item.quantity}</td>
                    <td className="px-4 py-2.5 text-right">₹{(item.unitPrice || 0).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">
                      ₹{((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} space-y-1.5 text-sm`}>
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₹{(selectedBill.subtotal || 0).toFixed(2)}</span></div>
            {selectedBill.discount > 0 && <div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="text-red-500">-₹{selectedBill.discount.toFixed(2)}</span></div>}
            {selectedBill.tax > 0 && <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>+₹{selectedBill.tax.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-base border-t border-gray-300 dark:border-gray-600 pt-2">
              <span>Total</span><span className="text-blue-600">₹{(selectedBill.totalAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between"><span className="text-gray-500">Amount Paid</span><span className="text-green-600 font-semibold">₹{(selectedBill.amountPaid || 0).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold">
              <span>Balance Due</span>
              <span className={selectedBill.balance > 0 ? 'text-red-600' : 'text-gray-400'}>
                ₹{(selectedBill.balance || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment history */}
          {selectedBill.payments?.length > 0 && (
            <div>
              <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Payment History</p>
              <div className="space-y-2">
                {selectedBill.payments.map((pmt, i) => (
                  <div key={i} className={`p-3 rounded-lg flex justify-between items-center ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div>
                      <p className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>₹{(pmt.amount || 0).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{pmt.paymentMethod} · {new Date(pmt.paymentDate).toLocaleDateString()}</p>
                    </div>
                    {pmt.transactionId && <p className="text-xs text-gray-400">ID: {pmt.transactionId}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedBill.notes && (
            <p className="text-sm text-gray-500"><span className="font-medium">Notes:</span> {selectedBill.notes}</p>
          )}
        </div>
      )}
      <div className="flex justify-end gap-3 mt-5">
        <button onClick={() => setShowInvoiceModal(false)}
          className={`px-5 py-2 rounded-lg border text-sm ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'} transition`}>
          Close
        </button>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2 text-sm bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition">
          <Download className="w-4 h-4" />Print
        </button>
      </div>
    </Modal>
  )

  // ─────────────────────────────────────────────────────────────
  // ██████████  PATIENT VIEW  ██████████
  // ─────────────────────────────────────────────────────────────
  if (isPatient) {
    const displayBills = patientTab === 'unpaid' ? unpaidBills : paidBills

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>My Bills & Payments</h1>
          <p className="text-sm text-gray-400 mt-1">View and pay your hospital bills</p>
        </div>

        <StatsRow patientMode />

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'unpaid', label: 'Unpaid Bills',  count: unpaidBills.length, color: 'text-red-600'   },
            { key: 'paid',   label: 'Paid Bills',    count: paidBills.length,   color: 'text-green-600' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setPatientTab(tab.key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition ${
                patientTab === tab.key
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-transparent'
                  : darkMode
                  ? 'border-gray-700 text-gray-400 hover:bg-gray-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className={`ml-2 text-xs font-bold ${patientTab === tab.key ? 'text-blue-100' : tab.color}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Bill cards */}
        {loading ? (
          <div className="flex items-center justify-center min-h-40">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-[3px] border-blue-100" />
              <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-600 animate-spin" />
            </div>
          </div>
        ) : displayBills.length === 0 ? (
          <div className={`${card} p-12 text-center`}>
            <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">
              {patientTab === 'unpaid' ? 'No outstanding bills — you\'re all clear!' : 'No paid bills yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayBills.map(bill => (
              <div key={bill._id} className={`${card} p-5 flex flex-col gap-3`}>
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-mono">{bill.billNumber}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(bill.billDate || bill.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <BillTypeBadge type={bill.billType} />
                </div>

                {/* Amount */}
                <div>
                  <p className="text-xs text-gray-500">Total Amount</p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    ₹{(bill.totalAmount || 0).toLocaleString()}
                  </p>
                  {bill.amountPaid > 0 && (
                    <p className="text-xs text-green-600 mt-0.5">
                      ₹{(bill.amountPaid || 0).toLocaleString()} paid · ₹{(bill.balance || 0).toLocaleString()} due
                    </p>
                  )}
                </div>

                {/* Creator info */}
                {bill.createdByRole && (
                  <p className="text-xs text-gray-400">Billed by: {bill.createdByRole}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => { setSelectedBill(bill); setShowInvoiceModal(true) }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm transition ${
                      darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Eye className="w-4 h-4" />View
                  </button>

                  {patientTab === 'unpaid' && (
                    <button
                      onClick={() => { setSelectedBill(bill); setPayNowMethod('UPI'); setShowPayNowModal(true) }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold hover:from-green-700 hover:to-emerald-700 transition"
                    >
                      <IndianRupee className="w-4 h-4" />Pay Now
                    </button>
                  )}

                  {patientTab === 'paid' && (
                    <span className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-semibold">
                      <CheckCircle className="w-4 h-4" />Paid
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pay Now Modal */}
        <Modal isOpen={showPayNowModal} onClose={() => setShowPayNowModal(false)} title="Pay Bill">
          {selectedBill && (
            <div className="space-y-5">
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-500">Bill #</span>
                  <span className="text-sm font-mono">{selectedBill.billNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Amount Due</span>
                  <span className={`text-2xl font-bold text-red-600`}>₹{(selectedBill.balance || 0).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className={lbl}>Payment Method *</label>
                <div className="grid grid-cols-2 gap-2">
                  {['UPI', 'Card', 'Net Banking', 'Cash'].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPayNowMethod(method)}
                      className={`py-3 rounded-xl border text-sm font-medium transition ${
                        payNowMethod === method
                          ? 'bg-blue-600 text-white border-blue-600'
                          : darkMode
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`p-3 rounded-lg text-sm ${darkMode ? 'bg-blue-900/20 border border-blue-800 text-blue-300' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
                This will mark your full outstanding balance of <strong>₹{(selectedBill.balance || 0).toLocaleString()}</strong> as paid.
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={() => setShowPayNowModal(false)}
              className={`px-5 py-2 rounded-lg border text-sm ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'} transition`}>
              Cancel
            </button>
            <button onClick={handlePatientPay} disabled={submitting}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50">
              {submitting ? 'Processing…' : `Confirm Payment`}
            </button>
          </div>
        </Modal>

        <InvoiceModal />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // ██████████  PHARMACIST VIEW  ██████████
  // ─────────────────────────────────────────────────────────────
  if (isPharmacist) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Pharmacy Billing</h1>
            <p className="text-sm text-gray-500 mt-1">Manage pharmacy bills — medicines and dispensing charges</p>
          </div>
          <button
            onClick={() => { resetGenerateForm(); setShowGenerateModal(true) }}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Pharmacy Bill</span>
          </button>
        </div>

        <StatsRow />

        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
          <Pill className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            Showing pharmacy bills only
          </span>
        </div>

        <TableComponent
          columns={columns}
          data={bills}
          searchPlaceholder="Search pharmacy bills…"
          emptyIcon={FileText}
          emptyText="No pharmacy bills found"
        />

        <GenerateModal />
        <InvoiceModal />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // ██████████  ADMIN / RECEPTIONIST VIEW  ██████████
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Billing & Payments</h1>
          <p className="text-sm text-gray-400 mt-1">Manage all invoices and track payments</p>
        </div>
        {canCreateBill && (
          <button
            onClick={() => { resetGenerateForm(); setShowGenerateModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> Generate Invoice
          </button>
        )}
      </div>

      <StatsRow />

      {/* Bill type filter tabs */}
      <div className={`flex gap-2 flex-wrap p-1.5 rounded-2xl border ${darkMode ? 'bg-gray-800/60 border-gray-700/60' : 'bg-gray-100/80 border-gray-200/60'}`}>
        {['All', ...BILL_TYPES].map(tab => {
          const count = tab === 'All' ? bills.length : bills.filter(b => b.billType === tab).length
          const isActive = billTypeFilter === tab
          return (
            <button
              key={tab}
              onClick={() => setBillTypeFilter(tab)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm shadow-blue-500/25'
                  : darkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white'
              }`}
            >
              {tab}
              <span className={`ml-1.5 text-xs tabular-nums ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <TableComponent
        columns={columns}
        data={filteredBills}
        searchPlaceholder="Search by bill number or patient name…"
        emptyIcon={FileText}
        emptyText="No bills found"
      />

      {/* Generate Bill Modal */}
      <GenerateModal />

      {/* Record Payment Modal (Admin/Receptionist) */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Payment">
        <div className="space-y-4">
          {selectedBill && (
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} text-sm`}>
              <p className="text-gray-500">Bill <span className="font-mono font-medium">{selectedBill.billNumber}</span></p>
              <p className="text-gray-500 mt-0.5">Balance due: <span className="font-bold text-red-600">₹{(selectedBill.balance || 0).toFixed(2)}</span></p>
            </div>
          )}
          <div>
            <label className={lbl}>Amount *</label>
            <input type="number" min="0" step="0.01" value={paymentData.amount}
              onChange={e => setPaymentData(p => ({ ...p, amount: e.target.value }))}
              className={inp} placeholder="Enter amount" />
          </div>
          <div>
            <label className={lbl}>Payment Method *</label>
            <select value={paymentData.paymentMethod}
              onChange={e => setPaymentData(p => ({ ...p, paymentMethod: e.target.value }))}
              className={inp}>
              <option value="">Select method…</option>
              {['Cash','Card','UPI','Net Banking','Cheque'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Transaction ID (optional)</label>
            <input type="text" value={paymentData.transactionId}
              onChange={e => setPaymentData(p => ({ ...p, transactionId: e.target.value }))}
              className={inp} placeholder="Transaction / reference ID" />
          </div>
          <div>
            <label className={lbl}>Notes (optional)</label>
            <textarea rows="2" value={paymentData.notes}
              onChange={e => setPaymentData(p => ({ ...p, notes: e.target.value }))}
              className={inp} placeholder="Any notes…" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={() => setShowPaymentModal(false)}
            className={`px-5 py-2 rounded-lg border text-sm ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'} transition`}>
            Cancel
          </button>
          <button onClick={handleRecordPayment} disabled={submitting}
            className="px-5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm rounded-lg hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50">
            {submitting ? 'Recording…' : 'Record Payment'}
          </button>
        </div>
      </Modal>

      {/* Insurance Modal */}
      <Modal isOpen={showInsuranceModal} onClose={() => setShowInsuranceModal(false)} title="Submit Insurance Claim">
        <div className="space-y-4">
          <div>
            <label className={lbl}>Claim Number *</label>
            <input type="text" value={insuranceData.claimNumber}
              onChange={e => setInsuranceData(d => ({ ...d, claimNumber: e.target.value }))}
              className={inp} placeholder="Claim reference number" />
          </div>
          <div>
            <label className={lbl}>Insurance Provider *</label>
            <input type="text" value={insuranceData.provider}
              onChange={e => setInsuranceData(d => ({ ...d, provider: e.target.value }))}
              className={inp} placeholder="Provider name" />
          </div>
          <div>
            <label className={lbl}>Amount Claimed *</label>
            <input type="number" min="0" step="0.01" value={insuranceData.amountClaimed}
              onChange={e => setInsuranceData(d => ({ ...d, amountClaimed: e.target.value }))}
              className={inp} placeholder="Amount to claim" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={() => setShowInsuranceModal(false)}
            className={`px-5 py-2 rounded-lg border text-sm ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'} transition`}>
            Cancel
          </button>
          <button onClick={handleProcessInsurance} disabled={submitting}
            className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm rounded-lg hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Submit Claim'}
          </button>
        </div>
      </Modal>

      <InvoiceModal />
    </div>
  )
}

export default Billing
