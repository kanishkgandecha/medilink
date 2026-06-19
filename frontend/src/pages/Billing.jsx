import React, { useState, useEffect, useMemo } from 'react'
import {
  Plus, DollarSign, FileText, Download, Eye, CreditCard,
  CheckCircle, Clock, Trash2, User, Calendar, Pill,
  Stethoscope, FlaskConical, Receipt, IndianRupee, Search, AlertTriangle, Printer, X, Bed
} from 'lucide-react'
import { generateBillPdf } from '../utils/generateBillPdf'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import TableComponent from '../components/common/TableComponent'
import Modal from '../components/common/Modal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { toast } from 'react-toastify'
import * as billingService from '../services/billingService'
import api from '../services/api'
import CardPagination, { paginateData } from '../components/common/CardPagination'
import PageLayout from '../components/common/PageLayout'
import TimeStamp from '../components/common/TimeStamp'

// ─── Constants ────────────────────────────────────────────────
const BILL_TYPES = ['Consultation', 'Pharmacy', 'Test', 'Ward', 'Other']

const BILL_TYPE_META = {
  Consultation: { icon: Stethoscope, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  Pharmacy:     { icon: Pill,         color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  Test:         { icon: FlaskConical, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  Ward:         { icon: Bed,          color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
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
  { name: 'Medicine (Custom)',          category: 'Medicine',     price: 0     }
]

const PHARMACY_TEMPLATES = [
  { name: 'Antibiotic (Custom)',        category: 'Medicine', price: 0 },
  { name: 'Painkiller / Analgesic',     category: 'Medicine', price: 0 },
  { name: 'Antacid / Antiflatulent',    category: 'Medicine', price: 0 },
  { name: 'Vitamin / Supplement',       category: 'Medicine', price: 0 },
  { name: 'Antihypertensive',           category: 'Medicine', price: 0 },
  { name: 'Antidiabetic',               category: 'Medicine', price: 0 },
  { name: 'Antihistamine / Allergy',    category: 'Medicine', price: 0 },
  { name: 'Antifungal / Antiviral',     category: 'Medicine', price: 0 },
  { name: 'Syrup / Suspension',         category: 'Medicine', price: 0 },
  { name: 'Topical / Ointment',         category: 'Medicine', price: 0 },
  { name: 'IV / Injectable',            category: 'Medicine', price: 0 },
  { name: 'Dispensing Charge',          category: 'Other',    price: 50 },
]

const EMPTY_GENERATE = {
  patient:           '',
  billType:          'Other',
  items:             [],
  discount:          0,
  tax:               0,
  notes:             '',
  insProvider:       '',
  insPolicyNumber:   '',
  insCoveragePercent: 0,
}

const EMPTY_ITEM         = { description: '', category: 'Consultation', quantity: 1, unitPrice: 0 }
const EMPTY_PHARMA_ITEM  = { description: '', category: 'Medicine',     quantity: 1, unitPrice: 0 }

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

// ─── Bill Card ────────────────────────────────────────────────
const BillCard = ({ bill, canManageAll, canDelete, onView, onPayment, onInsurance, onDelete, darkMode }) => {
  const patient  = bill.patient?.userId?.name || 'Unknown'
  const patId    = bill.patient?.patientId || ''
  const patInit  = patient.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const billDateVal = bill.billDate || bill.createdAt || null
  const total    = bill.totalAmount || 0
  const paid     = bill.amountPaid  || 0
  const balance  = bill.balance     || 0

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 transition-all duration-200
      ${darkMode
        ? 'bg-gray-800 border-gray-700/60 hover:border-gray-600'
        : 'bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-md hover:border-gray-200'}`}>

      {/* Top row: bill number + status */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-gray-400">{bill.billNumber}</span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[bill.paymentStatus] || STATUS_COLOR.Unpaid}`}>
          {bill.paymentStatus}
        </span>
      </div>

      {/* Patient row */}
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
          ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-[#EBF5FB] text-[#2E86DE]'}`}>
          {patInit}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{patient}</p>
          <p className="text-xs text-gray-400">{patId}</p>
        </div>
        <BillTypeBadge type={bill.billType} />
      </div>

      {/* Date */}
      {billDateVal && (
        <TimeStamp date={billDateVal} showTime={false} showRel={false} compact />
      )}

      {/* Amounts */}
      <div className={`grid grid-cols-3 gap-2 pt-2.5 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
        <div className="text-center">
          <p className={`text-[11px] font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Total</p>
          <p className={`text-sm font-bold tabular-nums ${darkMode ? 'text-white' : 'text-gray-900'}`}>₹{total.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className={`text-[11px] font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Paid</p>
          <p className="text-sm font-bold tabular-nums text-emerald-600">₹{paid.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className={`text-[11px] font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Balance</p>
          <p className={`text-sm font-bold tabular-nums ${balance > 0 ? 'text-red-600' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            ₹{balance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onView(bill)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all bg-blue-50 text-[#2E86DE] hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
          title="View Invoice"
        >
          <Eye className="w-3.5 h-3.5" /> Invoice
        </button>
        <button
          onClick={() => generateBillPdf(bill)}
          className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          title="Download PDF"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        {canManageAll && balance > 0 && (
          <>
            <button
              onClick={() => onPayment(bill)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400"
              title="Record Payment"
            >
              <CreditCard className="w-3.5 h-3.5" /> Pay
            </button>
            {!bill.insuranceClaim && (
              <button
                onClick={() => onInsurance(bill)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400"
                title="Insurance"
              >
                <FileText className="w-3.5 h-3.5" /> Ins.
              </button>
            )}
          </>
        )}
        {canDelete && bill.amountPaid === 0 && (
          <button
            onClick={() => onDelete(bill._id)}
            className="p-1.5 rounded-lg transition-all text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
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
  const [billSearch, setBillSearch]         = useState('')
  const [billPage, setBillPage]             = useState(1)
  const [patientTab, setPatientTab] = useState('unpaid')
  const [confirmDeleteBill, setConfirmDeleteBill] = useState(null)

  // Modals
  const [selectedBill, setSelectedBill]             = useState(null)
  const [showInvoiceModal, setShowInvoiceModal]     = useState(false)
  const [showPaymentModal, setShowPaymentModal]     = useState(false)
  const [showGenerateModal, setShowGenerateModal]   = useState(false)
  const [showInsuranceModal, setShowInsuranceModal] = useState(false)
  const [showPayNowModal, setShowPayNowModal]       = useState(false)

  // Form state
  const [generateData, setGenerateData] = useState(EMPTY_GENERATE)
  const [newItem, setNewItem]           = useState(isPharmacist ? EMPTY_PHARMA_ITEM : EMPTY_ITEM)
  const [paymentData, setPaymentData]   = useState({ amount: '', paymentMethod: '', transactionId: '', notes: '' })
  const [insuranceData, setInsuranceData] = useState({ claimNumber: '', provider: '', amountClaimed: '' })
  const [payNowMethod, setPayNowMethod] = useState('UPI')
  const [submitting, setSubmitting]     = useState(false)

  // Medicine state (pharmacist only)
  const [medicines, setMedicines]           = useState([])
  const [medicinesLoading, setMedLoading]   = useState(false)
  const [medicineSearch, setMedicineSearch] = useState('')
  const [medicineQtys, setMedicineQtys]     = useState({})

  // ── Helpers ──────────────────────────────────────────────────
  const inp = `w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${
    darkMode ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'
  }`
  const lbl = `block text-xs font-semibold uppercase tracking-wide mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`
  const card = `border rounded-xl ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)]'}`

  // ── Data fetching ────────────────────────────────────────────
  useEffect(() => {
    fetchBills()
    if (!isPatient) {
      fetchPatients()
      fetchStats()
    }
    if (isPharmacist) fetchMedicines()
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
      toast.error(err.response?.data?.message || err.message || 'Failed to fetch bills')
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

  const fetchMedicines = async () => {
    setMedLoading(true)
    try {
      const res = await api.get('/medicines', { params: { limit: 500, isActive: true } })
      const list = res.data || []
      setMedicines(list)
      const qtys = {}
      list.forEach(m => { qtys[m._id] = 1 })
      setMedicineQtys(qtys)
    } catch { toast.error('Failed to load medicines') }
    finally { setMedLoading(false) }
  }

  const addMedicineToItems = (medicine) => {
    const qty = medicineQtys[medicine._id] || 1
    if (qty < 1) return toast.error('Quantity must be at least 1')
    if (medicine.stockQuantity !== undefined && qty > medicine.stockQuantity) {
      return toast.error(`Only ${medicine.stockQuantity} in stock`)
    }
    setGenerateData(prev => ({
      ...prev,
      items: [...prev.items, {
        description: medicine.name,
        category:    'Medicine',
        quantity:    qty,
        unitPrice:   medicine.unitPrice ?? 0
      }]
    }))
    toast.success(`${medicine.name} added`)
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
      const res = await billingService.createBill({
        patient:  selected.userId._id,
        billType: effectiveBillType,
        items:    generateData.items,
        discount: parseFloat(generateData.discount) || 0,
        tax:      parseFloat(generateData.tax)      || 0,
        notes:    generateData.notes
      })

      // Auto-submit insurance claim if coverage details were provided
      const billId = res?.data?._id || res?._id
      const coveragePercent = parseFloat(generateData.insCoveragePercent) || 0
      if (billId && generateData.insProvider && coveragePercent > 0) {
        const { total } = calcTotal()
        const coveredAmount = parseFloat((total * coveragePercent / 100).toFixed(2))
        const claimNum = `CLM-${Date.now().toString(36).toUpperCase().slice(-6)}`
        try {
          await billingService.processInsuranceClaim(billId, {
            claimNumber:   claimNum,
            provider:      generateData.insProvider,
            amountClaimed: coveredAmount
          })
          toast.success(`Bill created and insurance claim (${generateData.insProvider}) submitted`)
        } catch {
          toast.success('Bill created successfully')
          toast.warn('Insurance claim could not be auto-submitted — submit manually')
        }
      } else {
        toast.success('Bill created successfully')
      }

      setShowGenerateModal(false)
      resetGenerateForm()
      fetchBills()
      if (!isPatient) fetchStats()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create bill')
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
    if (!newItem.description) return toast.error('Enter an item name')
    if (newItem.unitPrice <= 0) return toast.error('Enter a price greater than 0')
    setGenerateData(prev => ({ ...prev, items: [...prev.items, { ...newItem }] }))
    setNewItem(isPharmacist ? EMPTY_PHARMA_ITEM : EMPTY_ITEM)
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
    setNewItem(isPharmacist ? EMPTY_PHARMA_ITEM : EMPTY_ITEM)
  }

  // ── Filtered bill lists ───────────────────────────────────────
  const filteredBills = bills
    .filter(b => billTypeFilter === 'All' || b.billType === billTypeFilter)
    .filter(b => {
      if (!billSearch) return true
      const q = billSearch.toLowerCase()
      return [b.billNumber, b.patient?.userId?.name, b.patient?.patientId]
        .some(v => v?.toLowerCase().includes(q))
    })
  const pageBills = paginateData(filteredBills, billPage)

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
              onClick={() => setConfirmDeleteBill(row._id)}
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
    <div className="space-y-3">
      {[
        { label: patientMode ? 'Total Billed'  : 'Total Revenue',  value: `₹${(stats.totalRevenue   || 0).toLocaleString()}`, icon: DollarSign,  iconBg: 'bg-blue-50 text-[#2E86DE]'        },
        { label: patientMode ? 'Amount Paid'   : 'Collected',      value: `₹${(stats.totalCollected || 0).toLocaleString()}`, icon: CheckCircle, iconBg: 'bg-emerald-50 text-emerald-600'    },
        { label: patientMode ? 'Balance Due'   : 'Pending',        value: `₹${(stats.totalPending   || 0).toLocaleString()}`, icon: Clock,       iconBg: 'bg-red-50 text-red-600'            },
        { label: patientMode ? 'My Bills'      : 'Total Invoices', value:    (stats.totalBills       || 0),                   icon: FileText,    iconBg: 'bg-violet-50 text-violet-600'      }
      ].map(({ label, value, icon: Icon, iconBg }) => (
        <div key={label} className={`${card} p-4`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{label}</p>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-gray-700' : iconBg}`}>
              <Icon className="w-4 h-4" />
            </div>
          </div>
          <h3 className={`text-xl font-bold tabular-nums ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</h3>
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
                        ? 'bg-[#2E86DE] text-white border-[#2E86DE]'
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

        {/* Add item — pharmacist: live medicine picker; others: template/manual */}
        {isPharmacist ? (
          <div className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Select Medicines</p>
              {medicinesLoading && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
            </div>

            {/* Search */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={medicineSearch}
                onChange={e => setMedicineSearch(e.target.value)}
                placeholder="Search by name or generic name…"
                className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`}
              />
            </div>

            {/* Medicine list */}
            <div className={`max-h-52 overflow-y-auto rounded-lg border divide-y ${darkMode ? 'border-gray-700 divide-gray-700' : 'border-gray-200 divide-gray-100'}`}>
              {(() => {
                const q = medicineSearch.toLowerCase()
                const filtered = medicines.filter(m =>
                  !q || m.name?.toLowerCase().includes(q) || m.genericName?.toLowerCase().includes(q)
                )
                if (filtered.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-gray-400">
                      {medicineSearch ? 'No medicines match your search' : (medicinesLoading ? 'Loading medicines…' : 'No medicines found in database')}
                    </div>
                  )
                }
                return filtered.map(medicine => (
                  <div key={medicine._id} className={`flex items-center gap-3 px-3 py-2 ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} transition`}>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-xs truncate ${darkMode ? 'text-white' : 'text-gray-800'}`}>{medicine.name}</p>
                      {medicine.genericName && (
                        <p className="text-gray-400 text-xs truncate">{medicine.genericName}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 text-xs">
                      <p className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>₹{(medicine.unitPrice ?? 0).toFixed(2)}</p>
                      <p className={`${(medicine.stockQuantity ?? 0) > 0 ? 'text-gray-400' : 'text-red-500'}`}>
                        {medicine.stockQuantity ?? 0} in stock
                      </p>
                    </div>
                    <input
                      type="number" min="1" max={medicine.stockQuantity || 9999}
                      value={medicineQtys[medicine._id] || 1}
                      onChange={e => setMedicineQtys(prev => ({ ...prev, [medicine._id]: parseInt(e.target.value) || 1 }))}
                      className={`w-14 px-2 py-1.5 rounded-xl border text-xs text-center outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    />
                    <button
                      type="button"
                      onClick={() => addMedicineToItems(medicine)}
                      disabled={(medicine.stockQuantity ?? 0) < 1}
                      className="px-3 py-1.5 bg-[#2E86DE] text-white rounded-xl hover:bg-[#1a6db5] transition-all duration-200 text-xs font-semibold disabled:opacity-40 shrink-0"
                    >
                      Add
                    </button>
                  </div>
                ))
              })()}
            </div>

            {/* Custom / unlisted item (collapsible) */}
            <details className="mt-3">
              <summary className={`text-xs cursor-pointer select-none ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}>
                + Add custom item (not in database)
              </summary>
              <div className="grid grid-cols-12 gap-2 mt-2">
                <div className="col-span-5">
                  <input
                    type="text"
                    value={newItem.description}
                    onChange={e => setNewItem(it => ({ ...it, description: e.target.value }))}
                    placeholder="Item name…"
                    className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number" min="1"
                    value={newItem.quantity}
                    onChange={e => setNewItem(it => ({ ...it, quantity: parseInt(e.target.value) || 1 }))}
                    placeholder="Qty"
                    className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`}
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number" min="0" step="0.01"
                    value={newItem.unitPrice}
                    onChange={e => setNewItem(it => ({ ...it, unitPrice: parseFloat(e.target.value) || 0 }))}
                    placeholder="Price (₹)"
                    className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`}
                  />
                </div>
                <div className="col-span-2 flex items-center">
                  <button
                    onClick={addItem}
                    className="w-full py-2 bg-[#2E86DE] text-white rounded-xl hover:bg-[#1a6db5] transition-all duration-200 text-xs font-semibold"
                  >
                    <Plus className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              </div>
            </details>
          </div>
        ) : (
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
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`}
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
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Qty</label>
                <input
                  type="number" min="1"
                  value={newItem.quantity}
                  onChange={e => setNewItem(it => ({ ...it, quantity: parseInt(e.target.value) || 1 }))}
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Price (₹)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={newItem.unitPrice}
                  onChange={e => setNewItem(it => ({ ...it, unitPrice: parseFloat(e.target.value) || 0 }))}
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`}
                />
              </div>
              <div className="col-span-1 flex items-end">
                <button
                  onClick={addItem}
                  className="w-full py-2 bg-[#2E86DE] text-white rounded-xl hover:bg-[#1a6db5] transition-all duration-200 text-xs font-semibold"
                >
                  <Plus className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Items list */}
        {generateData.items.length > 0 && (
          <div className={`rounded-lg border overflow-hidden overflow-x-auto ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <table className="w-full text-sm min-w-[400px]">
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

        {/* Insurance Coverage (optional) */}
        <details className={`rounded-xl border overflow-hidden ${darkMode ? 'border-purple-800/50' : 'border-purple-200'}`}>
          <summary className={`px-4 py-3 cursor-pointer select-none text-sm font-semibold flex items-center gap-2 ${darkMode ? 'bg-purple-900/20 text-purple-300' : 'bg-purple-50 text-purple-700'}`}>
            <FileText className="w-4 h-4" />
            Insurance Coverage (optional)
            <span className="ml-auto text-xs font-normal text-gray-400">Click to expand</span>
          </summary>
          <div className={`p-4 space-y-3 ${darkMode ? 'bg-gray-800/50' : 'bg-white'}`}>
            <p className="text-xs text-gray-400">Enter insurance details to auto-submit a claim after bill creation.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Insurance Provider</label>
                <input type="text" value={generateData.insProvider}
                  onChange={e => setGenerateData(p => ({ ...p, insProvider: e.target.value }))}
                  className={`${inp} text-xs`} placeholder="e.g. Star Health" />
              </div>
              <div>
                <label className={lbl}>Policy Number</label>
                <input type="text" value={generateData.insPolicyNumber}
                  onChange={e => setGenerateData(p => ({ ...p, insPolicyNumber: e.target.value }))}
                  className={`${inp} text-xs`} placeholder="e.g. POL-123456" />
              </div>
            </div>
            <div>
              <label className={lbl}>Coverage Percentage (%)</label>
              <input type="number" min="0" max="100" step="1" value={generateData.insCoveragePercent}
                onChange={e => setGenerateData(p => ({ ...p, insCoveragePercent: e.target.value }))}
                className={`${inp} text-xs`} placeholder="e.g. 80" />
            </div>
            {generateData.insCoveragePercent > 0 && generateData.items.length > 0 && (() => {
              const { total } = calcTotal()
              const covered   = parseFloat((total * parseFloat(generateData.insCoveragePercent) / 100).toFixed(2))
              const remaining = parseFloat((total - covered).toFixed(2))
              return (
                <div className={`rounded-lg p-3 space-y-1.5 text-sm ${darkMode ? 'bg-purple-900/20 border border-purple-800/40' : 'bg-purple-50 border border-purple-200'}`}>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bill Total</span>
                    <span className="font-semibold">₹{total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Covered ({generateData.insCoveragePercent}%)</span>
                    <span className="font-semibold text-green-600">₹{covered.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-purple-200 dark:border-purple-700 pt-1.5">
                    <span>Patient Pays</span>
                    <span className="text-blue-600">₹{remaining.toFixed(2)}</span>
                  </div>
                </div>
              )
            })()}
          </div>
        </details>
      </div>

      <div className="flex justify-end gap-3 mt-5">
        <button onClick={() => { setShowGenerateModal(false); resetGenerateForm() }}
          className={`px-4 py-2.5 rounded-xl border text-sm font-medium ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'} transition`}>
          Cancel
        </button>
        <button onClick={handleGenerateBill} disabled={submitting}
          className="px-5 py-2.5 bg-[#2E86DE] hover:bg-[#1a6db5] text-white text-sm font-semibold rounded-xl shadow-[0_2px_8px_rgba(46,134,222,0.35)] transition-all disabled:opacity-50">
          {submitting ? 'Creating…' : 'Create Bill'}
        </button>
      </div>
    </Modal>
  )

  // ─────────────────────────────────────────────────────────────
  // INVOICE MODAL
  // ─────────────────────────────────────────────────────────────
  const InvoiceModal = () => (
    <>
      {/* Print-only styles: hide everything except our invoice div */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #medilink-print-invoice, #medilink-print-invoice * { visibility: visible !important; }
          #medilink-print-invoice {
            position: absolute !important;
            top: 0 !important; left: 0 !important; right: 0 !important;
            height: auto !important; min-height: 100% !important;
            width: 100% !important; overflow: visible !important;
            padding: 40px !important; background: #fff !important;
          }
        }
      `}</style>

      {/* Off-screen printable invoice — revealed only via @media print */}
      <div
        id="medilink-print-invoice"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', top: 0, height: '1px', width: '1px', overflow: 'hidden' }}
      >
        {selectedBill && (
          <div style={{ fontFamily: 'Arial, sans-serif', color: '#111', background: '#fff', maxWidth: '750px', margin: '0 auto' }}>
            {/* Hospital header */}
            <div style={{ textAlign: 'center', borderBottom: '3px solid #2563eb', paddingBottom: '20px', marginBottom: '28px' }}>
              <div style={{ fontSize: '30px', fontWeight: '900', color: '#2563eb', letterSpacing: '-0.5px' }}>MediLink</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Hospital Management System</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>123 Healthcare Avenue, Medical City · support@medilink.com · +91 98765 43210</div>
            </div>

            {/* Invoice meta */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '28px', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '1px' }}>INVOICE</div>
                <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>#{selectedBill.billNumber}</div>
                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                  {new Date(selectedBill.billDate || selectedBill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>Type: <strong>{selectedBill.billType}</strong></div>
              </div>
              <div style={{
                padding: '8px 20px', borderRadius: '24px', fontSize: '13px', fontWeight: '700', letterSpacing: '0.5px',
                background: selectedBill.paymentStatus === 'Paid' ? '#dcfce7' : selectedBill.paymentStatus === 'Partially-Paid' ? '#fef9c3' : '#fee2e2',
                color:      selectedBill.paymentStatus === 'Paid' ? '#15803d' : selectedBill.paymentStatus === 'Partially-Paid' ? '#a16207' : '#dc2626',
                border: `1px solid ${selectedBill.paymentStatus === 'Paid' ? '#bbf7d0' : selectedBill.paymentStatus === 'Partially-Paid' ? '#fde68a' : '#fecaca'}`,
              }}>
                {(selectedBill.paymentStatus || 'Unpaid').toUpperCase()}
              </div>
            </div>

            {/* Bill To / Doctor */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '28px' }}>
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '700', color: '#94a3b8', letterSpacing: '1px', marginBottom: '8px' }}>Bill To</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{selectedBill.patient?.userId?.name || 'Unknown Patient'}</div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>Patient ID: {selectedBill.patient?.patientId || 'N/A'}</div>
                {selectedBill.patient?.userId?.email && (
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>{selectedBill.patient.userId.email}</div>
                )}
              </div>
              {selectedBill.doctor && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '700', color: '#94a3b8', letterSpacing: '1px', marginBottom: '8px' }}>Attending Doctor</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Dr. {selectedBill.doctor?.userId?.name || selectedBill.doctor?.name || 'N/A'}</div>
                  {selectedBill.doctor?.specialization && (
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{selectedBill.doctor.specialization}</div>
                  )}
                </div>
              )}
            </div>

            {/* Items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['#','Description','Category','Qty','Unit Price','Amount'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Qty' ? 'center' : ['Unit Price','Amount'].includes(h) ? 'right' : 'left', color: '#475569', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedBill.items?.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{i + 1}</td>
                    <td style={{ padding: '10px 14px', fontWeight: '500', color: '#0f172a' }}>{item.description}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{item.category}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>₹{(item.unitPrice || 0).toFixed(2)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '600' }}>₹{((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Financial summary */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '28px' }}>
              <div style={{ width: '280px', borderTop: '2px solid #e2e8f0', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#64748b' }}>
                  <span>Subtotal</span><span>₹{(selectedBill.subtotal || 0).toFixed(2)}</span>
                </div>
                {selectedBill.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Discount</span>
                    <span style={{ color: '#dc2626' }}>−₹{selectedBill.discount.toFixed(2)}</span>
                  </div>
                )}
                {selectedBill.tax > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Tax</span><span>+₹{selectedBill.tax.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 5px', fontSize: '16px', fontWeight: '800', borderTop: '2px solid #0f172a', marginTop: '6px', color: '#0f172a' }}>
                  <span>Total</span><span>₹{(selectedBill.totalAmount || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Amount Paid</span>
                  <span style={{ color: '#16a34a', fontWeight: '600' }}>₹{(selectedBill.amountPaid || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '14px', fontWeight: '700' }}>
                  <span>Balance Due</span>
                  <span style={{ color: (selectedBill.balance || 0) > 0 ? '#dc2626' : '#64748b' }}>₹{(selectedBill.balance || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {selectedBill.insuranceClaim?.claimNumber && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '700', color: '#7c3aed', letterSpacing: '1px', marginBottom: '8px' }}>Insurance Claim</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', fontSize: '13px' }}>
                  <div><span style={{ color: '#64748b' }}>Provider: </span><strong>{selectedBill.insuranceClaim.provider || '—'}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Claim #: </span><strong>{selectedBill.insuranceClaim.claimNumber}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Amount Claimed: </span><strong style={{ color: '#16a34a' }}>₹{(selectedBill.insuranceClaim.amountClaimed || 0).toFixed(2)}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Status: </span><strong>{selectedBill.insuranceClaim.status || 'Pending'}</strong></div>
                  {selectedBill.insuranceClaim.approvedAmount > 0 && (
                    <div><span style={{ color: '#64748b' }}>Approved: </span><strong style={{ color: '#16a34a' }}>₹{selectedBill.insuranceClaim.approvedAmount.toFixed(2)}</strong></div>
                  )}
                </div>
              </div>
            )}
            {selectedBill.notes && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '700', color: '#94a3b8', letterSpacing: '1px', marginBottom: '6px' }}>Notes</div>
                <div style={{ fontSize: '14px', color: '#374151' }}>{selectedBill.notes}</div>
              </div>
            )}
            {selectedBill.createdByRole && (
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '20px' }}>Billed by: {selectedBill.createdByRole}</div>
            )}

            {/* Footer */}
            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#64748b' }}>Thank you for choosing MediLink Hospital.</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>For queries: support@medilink.com · This is a system-generated invoice.</div>
            </div>
          </div>
        )}
      </div>

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
            <div className={`rounded-lg border overflow-hidden overflow-x-auto ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <table className="w-full text-sm min-w-[500px]">
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

            {/* Insurance claim */}
            {selectedBill.insuranceClaim?.claimNumber && (
              <div className={`p-3 rounded-lg border ${darkMode ? 'bg-purple-900/20 border-purple-800/40' : 'bg-purple-50 border-purple-200'}`}>
                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-2">Insurance Claim</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>Provider: <strong className="text-gray-700 dark:text-gray-300">{selectedBill.insuranceClaim.provider || '—'}</strong></span>
                  <span>Claim #: <strong className="text-gray-700 dark:text-gray-300">{selectedBill.insuranceClaim.claimNumber}</strong></span>
                  <span>Claimed: <strong className="text-green-600">₹{(selectedBill.insuranceClaim.amountClaimed || 0).toFixed(2)}</strong></span>
                  <span>Status: <strong className={selectedBill.insuranceClaim.status === 'Approved' ? 'text-green-600' : selectedBill.insuranceClaim.status === 'Rejected' ? 'text-red-600' : 'text-amber-600'}>{selectedBill.insuranceClaim.status || 'Pending'}</strong></span>
                  {selectedBill.insuranceClaim.approvedAmount > 0 && (
                    <span>Approved: <strong className="text-green-600">₹{selectedBill.insuranceClaim.approvedAmount.toFixed(2)}</strong></span>
                  )}
                </div>
              </div>
            )}

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
            className={`px-5 py-2.5 rounded-xl border text-sm ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'} transition`}>
            Close
          </button>
          <button
            onClick={() => selectedBill && generateBillPdf(selectedBill)}
            className="flex items-center gap-2 px-5 py-2 text-sm border border-[#2E86DE] text-[#2E86DE] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition"
          >
            <Download className="w-4 h-4" />Download PDF
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-[#2E86DE] hover:bg-[#1a6db5] text-white rounded-xl shadow-[0_2px_8px_rgba(46,134,222,0.35)] transition-all duration-200">
            <Printer className="w-4 h-4" />Print Invoice
          </button>
        </div>
      </Modal>
    </>
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

        <PageLayout leftPanel={<StatsRow patientMode />}>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'unpaid', label: 'Unpaid Bills',  count: unpaidBills.length, color: 'text-red-600'   },
            { key: 'paid',   label: 'Paid Bills',    count: paidBills.length,   color: 'text-green-600' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setPatientTab(tab.key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                patientTab === tab.key
                  ? 'bg-[#2E86DE] text-white border-transparent shadow-[0_2px_8px_rgba(46,134,222,0.35)]'
                  : darkMode
                  ? 'border-gray-700 text-gray-400 hover:bg-gray-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
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
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all duration-200"
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

        </PageLayout>

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
                          ? 'bg-[#2E86DE] text-white border-[#2E86DE]'
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
              className={`px-5 py-2.5 rounded-xl border text-sm ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'} transition`}>
              Cancel
            </button>
            <button onClick={handlePatientPay} disabled={submitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50">
              {submitting ? 'Processing…' : `Confirm Payment`}
            </button>
          </div>
        </Modal>

        {InvoiceModal()}
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
            onClick={() => { setGenerateData(EMPTY_GENERATE); setNewItem(EMPTY_PHARMA_ITEM); setShowGenerateModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-[#2E86DE] hover:bg-[#1a6db5] text-white rounded-xl shadow-[0_2px_8px_rgba(46,134,222,0.35)] transition-all active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Pharmacy Bill</span>
          </button>
        </div>

        <PageLayout leftPanel={<StatsRow />}>

        <div className={`flex flex-wrap gap-3 items-center p-3 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
            <Pill className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400">Pharmacy bills</span>
          </div>
          <div className={`flex items-center gap-2 flex-1 min-w-[180px] px-3 py-1.5 rounded-xl border text-sm ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              value={billSearch}
              onChange={e => { setBillSearch(e.target.value); setBillPage(1) }}
              placeholder="Search pharmacy bills…"
              className="bg-transparent flex-1 outline-none text-sm placeholder-gray-400"
            />
            {billSearch && <button onClick={() => setBillSearch('')}><X className="w-3 h-3 text-gray-400" /></button>}
          </div>
          <span className={`text-xs tabular-nums ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {bills.filter(b => !billSearch || b.billNumber?.toLowerCase().includes(billSearch.toLowerCase()) || b.patient?.userId?.name?.toLowerCase().includes(billSearch.toLowerCase())).length} bills
          </span>
        </div>

        {(() => {
          const pharmFiltered = bills.filter(b => !billSearch || b.billNumber?.toLowerCase().includes(billSearch.toLowerCase()) || b.patient?.userId?.name?.toLowerCase().includes(billSearch.toLowerCase()))
          const pharmPage = paginateData(pharmFiltered, billPage)
          return loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`rounded-xl border h-48 animate-pulse ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`} />
              ))}
            </div>
          ) : pharmFiltered.length === 0 ? (
            <div className={`${card} py-16 text-center`}>
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>No pharmacy bills found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {pharmPage.map(bill => (
                  <BillCard
                    key={bill._id}
                    bill={bill}
                    canManageAll={false}
                    canDelete={false}
                    onView={b => { setSelectedBill(b); setShowInvoiceModal(true) }}
                    onPayment={() => {}}
                    onInsurance={() => {}}
                    onDelete={() => {}}
                    darkMode={darkMode}
                  />
                ))}
              </div>
              <CardPagination total={pharmFiltered.length} page={billPage} onPage={p => { setBillPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
            </>
          )
        })()}

        </PageLayout>

        {GenerateModal()}
        {InvoiceModal()}
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
            onClick={() => { setGenerateData(EMPTY_GENERATE); setNewItem(EMPTY_ITEM); setShowGenerateModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-[#2E86DE] hover:bg-[#1a6db5] text-white rounded-xl shadow-[0_2px_8px_rgba(46,134,222,0.35)] transition-all active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" /> Generate Invoice
          </button>
        )}
      </div>

      <PageLayout leftPanel={<StatsRow />}>

      {/* Bill type filter tabs */}
      <div className={`flex gap-2 flex-wrap p-1.5 rounded-2xl border ${darkMode ? 'bg-gray-800/60 border-gray-700/60' : 'bg-gray-100/80 border-gray-200/60'}`}>
        {['All', ...BILL_TYPES].map(tab => {
          const count = tab === 'All' ? bills.length : bills.filter(b => b.billType === tab).length
          const isActive = billTypeFilter === tab
          return (
            <button
              key={tab}
              onClick={() => { setBillTypeFilter(tab); setBillPage(1) }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[#2E86DE] text-white shadow-sm'
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

      {/* Search */}
      <div className={`${card} p-3`}>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-lg border
            ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by bill number or patient name…"
              value={billSearch}
              onChange={e => { setBillSearch(e.target.value); setBillPage(1) }}
              className={`bg-transparent text-sm outline-none flex-1 ${darkMode ? 'text-white placeholder-gray-500' : 'text-gray-900'}`}
            />
            {billSearch && (
              <button onClick={() => setBillSearch('')} className="text-gray-400 hover:text-gray-600 transition">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className={`text-sm px-3 font-medium whitespace-nowrap ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {filteredBills.length} bill{filteredBills.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Bill cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`rounded-xl border h-48 animate-pulse ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`} />
          ))}
        </div>
      ) : filteredBills.length === 0 ? (
        <div className={`${card} py-16 text-center`}>
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>No bills found</p>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {billSearch ? 'Try adjusting your search' : 'Generate an invoice to get started'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {pageBills.map(bill => (
              <BillCard
                key={bill._id}
                bill={bill}
                canManageAll={canManageAll}
                canDelete={['Admin'].includes(user?.role)}
                onView={b => { setSelectedBill(b); setShowInvoiceModal(true) }}
                onPayment={b => { setSelectedBill(b); setPaymentData(p => ({ ...p, amount: b.balance })); setShowPaymentModal(true) }}
                onInsurance={b => { setSelectedBill(b); setInsuranceData(d => ({ ...d, amountClaimed: b.balance.toString() })); setShowInsuranceModal(true) }}
                onDelete={id => setConfirmDeleteBill(id)}
                darkMode={darkMode}
              />
            ))}
          </div>
          <CardPagination total={filteredBills.length} page={billPage} onPage={p => { setBillPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
        </>
      )}

      </PageLayout>

      {/* Generate Bill Modal */}
      {GenerateModal()}

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
            className={`px-5 py-2.5 rounded-xl border text-sm ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'} transition`}>
            Cancel
          </button>
          <button onClick={handleRecordPayment} disabled={submitting}
            className="px-5 py-2 bg-[#2E86DE] hover:bg-[#1a6db5] text-white text-sm font-semibold rounded-xl shadow-[0_2px_8px_rgba(46,134,222,0.35)] transition-all duration-200 disabled:opacity-50">
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
            className={`px-5 py-2.5 rounded-xl border text-sm ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'} transition`}>
            Cancel
          </button>
          <button onClick={handleProcessInsurance} disabled={submitting}
            className="px-5 py-2 bg-[#2E86DE] hover:bg-[#1a6db5] text-white text-sm font-semibold rounded-xl shadow-[0_2px_8px_rgba(46,134,222,0.35)] transition-all duration-200 disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Submit Claim'}
          </button>
        </div>
      </Modal>

      {InvoiceModal()}

      <ConfirmDialog
        isOpen={!!confirmDeleteBill}
        onClose={() => setConfirmDeleteBill(null)}
        onConfirm={() => handleDeleteBill(confirmDeleteBill)}
        title="Delete Bill"
        message="This will permanently delete this bill. Only unpaid bills with no payment can be deleted."
        confirmLabel="Delete"
      />
    </div>
  )
}

export default Billing
